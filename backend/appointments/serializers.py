from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from .models import Availability, AvailableSlot, Booking
from chat.services.chat_service import sync_chat_room_for_booking
from notifications.services import create_notification
from notifications.time_formatting import format_india_slot
from chat.services.chat_service import ensure_chat_room_for_booking
from finance.services.amounts import calculate_booking_amounts, calculate_psychologist_payout, money
from finance.services.bookings import ( complete_booking_payment, credit_admin_for_booking, refund_booking_to_patient,)
from consultations.services.consultation_service import (consultation_state, create_consultation_for_booking,)
from patient_summary.serializers import patient_summary_payload
from patient_summary.services.summary_service import update_patient_summary_for_consultation
from reviews.models import ConsultationReview
from reviews.serializers import review_payload
from finance.services.razorpay import create_razorpay_order
from finance.services.wallets import debit_wallet, get_wallet


"""
TIME ZONE
"""
INDIA_TZ = ZoneInfo("Asia/Kolkata")
ACTIVE_BOOKING_STATUSES = ("PENDING", "CONFIRMED")


def get_india_now():
    return timezone.now().astimezone(INDIA_TZ)


def is_future_slot(date_value, start_time_value):
    slot_start = datetime.combine(date_value, start_time_value, tzinfo=INDIA_TZ)
    return slot_start > get_india_now()


def is_slot_after_booking(slot, booking):
    if slot.availability.date > booking.date:
        return True

    if slot.availability.date < booking.date:
        return False

    return slot.start_time >= booking.end_time


def patient_has_slot_conflict(patient, date_value, start_time_value, end_time_value, exclude_booking=None):
    if not patient:
        return False

    conflicts = Booking.objects.filter(
        patient=patient,
        date=date_value,
        status__in=ACTIVE_BOOKING_STATUSES,
        start_time__lt=end_time_value,
        end_time__gt=start_time_value,
    )
    if exclude_booking:
        conflicts = conflicts.exclude(id=exclude_booking.id)
    return conflicts.exists()


"""
AVAILABLE SLOT SERIALIZER
"""
class AvailableSlotSerializer(serializers.ModelSerializer):
    is_booked = serializers.SerializerMethodField()
    is_locked_for_patient = serializers.SerializerMethodField()

    def get_is_booked(self, obj):
        return obj.is_booked or self.get_is_locked_for_patient(obj)

    def get_is_locked_for_patient(self, obj):
        patient = self.context.get("patient")
        if not patient:
            return False
        cache = self.context.setdefault("_patient_slot_conflicts", {})
        cache_key = (obj.availability.date, obj.start_time, obj.end_time)
        if cache_key in cache:
            return cache[cache_key]

        cache[cache_key] = patient_has_slot_conflict(
            patient,
            obj.availability.date,
            obj.start_time,
            obj.end_time,
        )
        return cache[cache_key]

    class Meta:
        model = AvailableSlot
        fields = [
            "id",
            "start_time",
            "end_time",
            "is_booked",
            "is_locked_for_patient",
        ]

"""
AVAILABILITY SERIALIZER
"""
class AvailabilitySerializer(serializers.ModelSerializer):
    slots = serializers.SerializerMethodField()

    def get_slots(self, obj):
        future_slots = sorted([
            slot for slot in obj.slots.all()
            if is_future_slot(obj.date, slot.start_time)
        ], key=lambda slot: (slot.start_time, slot.end_time))
        return AvailableSlotSerializer(
            future_slots,
            many=True,
            context=self.context,
        ).data

    class Meta:
        model = Availability
        fields = [
            "id",
            "date",
            "slots",
        ]

"""
CREATE SLOTS
"""
class CreateAvailabilitySerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["single", "range"], required=False, default="single")
    date = serializers.DateField(required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    slots = serializers.ListField(child=serializers.DictField(), allow_empty=False, required=False)
    days = serializers.ListField(child=serializers.DictField(), allow_empty=False, required=False)

    def validate_slots(self, value):
        if not value:
            raise serializers.ValidationError("At least one slot is required")

        for slot in value:
            if "start_time" not in slot or "end_time" not in slot:
                raise serializers.ValidationError(
                    "Each slot must have start_time and end_time"
                )
        return value

    def validate(self, attrs):
        mode = attrs.get("mode", "single")
        date = attrs.get("date")
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        cutoff = datetime.now(INDIA_TZ) + timedelta(hours=24)

        if mode == "single":
            slots = attrs.get("slots")
            if not date:
                raise serializers.ValidationError({"date": "Choose a date."})
            if not slots:
                raise serializers.ValidationError({"slots": "At least one slot is required"})
            dates = [date]
            normalized_slots = self._normalize_slots(slots, dates, cutoff)
            attrs["dates"] = dates
            attrs["slots"] = normalized_slots
            return attrs

        days = attrs.get("days")
        if days:
            normalized_days = []
            seen_dates = set()

            for day in days:
                current_date = day.get("date")
                current_slots = day.get("slots")

                if not current_date:
                    raise serializers.ValidationError({"days": "Each day must include a date."})

                if isinstance(current_date, str):
                    current_date = datetime.strptime(current_date, "%Y-%m-%d").date()

                if current_date in seen_dates:
                    raise serializers.ValidationError({"days": "Duplicate dates are not allowed."})
                seen_dates.add(current_date)

                if not current_slots:
                    continue

                normalized_days.append({
                    "date": current_date,
                    "slots": self._normalize_slots(current_slots, [current_date], cutoff),
                })

            if not normalized_days:
                raise serializers.ValidationError({"days": "At least one day must include a slot."})

            attrs["days"] = normalized_days
            return attrs

        slots = attrs.get("slots")
        if not slots:
            raise serializers.ValidationError({"slots": "At least one slot is required"})

        if not start_date or not end_date:
            raise serializers.ValidationError({
                "start_date": "Choose a start date.",
                "end_date": "Choose an end date.",
            })
        if end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be on or after the start date."}
            )

        day_span = (end_date - start_date).days
        dates = [start_date + timedelta(days=offset) for offset in range(day_span + 1)]
        normalized_slots = self._normalize_slots(slots, dates, cutoff)
        attrs["dates"] = dates
        attrs["slots"] = normalized_slots
        return attrs

    def _normalize_slots(self, slots, dates, cutoff):
        normalized_slots = []

        for slot in slots:
            start_time = slot["start_time"]
            end_time = slot["end_time"]
            if isinstance(start_time, str):
                start_time = datetime.strptime(start_time, "%H:%M").time()
            if isinstance(end_time, str):
                end_time = datetime.strptime(end_time, "%H:%M").time()

            if end_time <= start_time:
                raise serializers.ValidationError(
                    "Each slot end time must be after its start time."
                )

            for current_date in dates:
                slot_start = datetime.combine(current_date, start_time, tzinfo=INDIA_TZ)
                if slot_start <= cutoff:
                    raise serializers.ValidationError(
                        "Availability can only be added for slots more than 24 hours in advance"
                    )

            normalized_slots.append({
                "start_time": start_time,
                "end_time": end_time,
            })

        return normalized_slots

    def create(self, validated_data):
        psychologist = self.context["psychologist"]
        created_availabilities = []

        with transaction.atomic():
            if validated_data.get("days"):
                for day in validated_data["days"]:
                    availability, _ = Availability.objects.get_or_create(
                        psychologist=psychologist,
                        date=day["date"],
                    )

                    for slot in day["slots"]:
                        AvailableSlot.objects.get_or_create(
                            availability=availability,
                            start_time=slot["start_time"],
                            end_time=slot["end_time"],
                        )

                    created_availabilities.append(availability)
            else:
                dates = validated_data["dates"]
                slots_data = validated_data["slots"]

                for current_date in dates:
                    availability, _ = Availability.objects.get_or_create(
                        psychologist=psychologist,
                        date=current_date
                    )

                    for slot in slots_data:
                        AvailableSlot.objects.get_or_create(
                            availability=availability,
                            start_time=slot["start_time"],
                            end_time=slot["end_time"],
                        )

                    created_availabilities.append(availability)

        return Availability.objects.filter(
            id__in=[availability.id for availability in created_availabilities]
        ).prefetch_related("slots").order_by("date")


"""
REVOKE AVILABILITY
"""
class RevokeAvailabilitySlotSerializer(serializers.Serializer):
    slot_id = serializers.UUIDField()

    def validate(self, attrs):
        psychologist = self.context["psychologist"]

        try:
            slot = AvailableSlot.objects.select_related("availability").get(id=attrs["slot_id"])
        except AvailableSlot.DoesNotExist:
            raise serializers.ValidationError({"slot_id": "Invalid slot."})

        if slot.availability.psychologist_id != psychologist.psychologist_id:
            raise serializers.ValidationError({"slot_id": "This slot does not belong to you."})

        if slot.is_booked:
            raise serializers.ValidationError(
                {"slot_id": "Booked slots cannot be revoked."}
            )

        if not is_future_slot(slot.availability.date, slot.start_time):
            raise serializers.ValidationError(
                {"slot_id": "Past slots cannot be revoked."}
            )

        attrs["slot"] = slot
        return attrs

    def save(self, **kwargs):
        slot = self.validated_data["slot"]
        availability = slot.availability

        with transaction.atomic():
            locked_slot = AvailableSlot.objects.select_for_update().select_related(
                "availability"
            ).get(id=slot.id)

            if locked_slot.is_booked:
                raise serializers.ValidationError(
                    {"slot_id": "Booked slots cannot be revoked."}
                )

            availability = locked_slot.availability
            locked_slot.delete()

            if not availability.slots.exists():
                availability.delete()
                return None

            return Availability.objects.prefetch_related("slots").get(id=availability.id)


"""
BOOKING SERIALIZER
"""
class BookingSerializer(serializers.ModelSerializer):
    slot = AvailableSlotSerializer(read_only=True)
    patient_name = serializers.CharField(source="patient.user.full_name", read_only=True)
    patient_photo = serializers.SerializerMethodField()
    psychologist_name = serializers.CharField(source="psychologist.user.full_name", read_only=True)
    psychologist_photo = serializers.SerializerMethodField()
    psychologist_id = serializers.CharField(source="psychologist.psychologist_id", read_only=True)
    specialization = serializers.SerializerMethodField()
    cancellation_note = serializers.CharField(source="notes", read_only=True)
    chat_enabled = serializers.SerializerMethodField()
    commission_percentage = serializers.SerializerMethodField()
    admin_commission_amount = serializers.SerializerMethodField()
    psychologist_payout_amount = serializers.SerializerMethodField()
    consultation = serializers.SerializerMethodField()
    consultation_history = serializers.SerializerMethodField()
    patient_summary = serializers.SerializerMethodField()
    review = serializers.SerializerMethodField()
    complaint = serializers.SerializerMethodField()

    def get_psychologist_photo(self, obj):
        request = self.context.get("request")
        user = obj.psychologist.user
        photo = user.profile_picture if user.profile_picture else None
        if not photo:
            # Fall back to the application photo if user has none
            app = getattr(user, "application", None)
            if app and getattr(app, "profile_picture", None):
                photo = app.profile_picture
        if photo and request:
            try:
                return request.build_absolute_uri(photo.url)
            except Exception:
                return None
        return None

    def get_patient_photo(self, obj):
        request = self.context.get("request")
        photo = obj.patient.user.profile_picture if obj.patient.user.profile_picture else None
        if photo and request:
            try:
                return request.build_absolute_uri(photo.url)
            except Exception:
                return None
        return None

    def get_specialization(self, obj):
        specs = obj.psychologist.specializations.all()
        if specs.exists():
            return specs.first().name
        return None

    def get_chat_enabled(self, obj):
        return obj.status == "CONFIRMED"

    def get_commission_percentage(self, obj):
        return calculate_psychologist_payout(obj)["commission_percentage"]

    def get_admin_commission_amount(self, obj):
        return calculate_psychologist_payout(obj)["commission_amount"]

    def get_psychologist_payout_amount(self, obj):
        return calculate_psychologist_payout(obj)["psychologist_payout"]

    def get_consultation(self, obj):
        request = self.context.get("request")
        return consultation_state(obj, user=getattr(request, "user", None))

    def get_consultation_history(self, obj):
        request = self.context.get("request")
        if not request or getattr(request.user, "role", None) != "PSYCHOLOGIST":
            return []

        from consultations.models import Consultation

        consultations = (
            Consultation.objects.select_related("booking__psychologist__user")
            .filter(
                booking__patient_id=obj.patient_id,
                status="COMPLETED",
            )
            .exclude(booking_id=obj.id)
            .order_by("-booking__date", "-booking__start_time")[:10]
        )
        return [
            {
                "booking_id": consultation.booking_id,
                "date": consultation.booking.date,
                "start_time": consultation.booking.start_time,
                "end_time": consultation.booking.end_time,
                "psychologist_name": consultation.booking.psychologist.user.full_name,
                "patient_note": consultation.patient_note,
                "psychologist_note": consultation.psychologist_note,
            }
            for consultation in consultations
        ]

    def get_patient_summary(self, obj):
        request = self.context.get("request")
        if not request or getattr(request.user, "role", None) != "PSYCHOLOGIST":
            return None
        return patient_summary_payload(obj.patient)

    def get_review(self, obj):
        try:
            review = obj.review
        except ConsultationReview.DoesNotExist:
            review = None
        return review_payload(review)

    def get_complaint(self, obj):
        request = self.context.get("request")
        if not request or getattr(request.user, "role", None) != "PATIENT":
            return None

        from complaints.models import Complaint
        from complaints.services import complaint_eligibility_for_booking

        patient = obj.patient
        try:
            complaint = obj.complaint
        except Complaint.DoesNotExist:
            complaint = None

        payload = complaint_eligibility_for_booking(obj, patient=patient)
        if complaint:
            payload["complaint"] = {
                "id": str(complaint.id),
                "complaint_id": complaint.complaint_id,
                "status": complaint.status,
                "status_display": complaint.get_status_display(),
                "created_at": complaint.created_at,
            }
        else:
            payload["complaint"] = None
        return payload

    class Meta:
        model = Booking
        fields = [
            "id",
            "patient",
            "patient_name",
            "patient_photo",
            "psychologist",
            "psychologist_id",
            "psychologist_name",
            "psychologist_photo",
            "specialization",
            "date",
            "start_time",
            "end_time",
            "status",
            "payment_status",
            "consultation_fee",
            "gst_amount",
            "total_amount",
            "wallet_amount",
            "razorpay_amount",
            "commission_percentage",
            "admin_commission_amount",
            "psychologist_payout_amount",
            "consultation",
            "consultation_history",
            "patient_summary",
            "review",
            "complaint",
            "psychologist_paid_at",
            "meeting_link",
            "cancellation_note",
            "chat_enabled",
            "slot",
            "created_at",
        ]
        read_only_fields = fields


"""
CREATE BOOKING
"""
class CreateBookingSerializer(serializers.Serializer):
    slot_id = serializers.UUIDField()
    wallet_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)

    def validate(self, attrs):
        try:
            slot = AvailableSlot.objects.select_related("availability").get(
                id=attrs["slot_id"]
            )
        except AvailableSlot.DoesNotExist:
            raise serializers.ValidationError("Invalid slot")

        if slot.is_booked:
            raise serializers.ValidationError("Slot already booked")

        if not is_future_slot(slot.availability.date, slot.start_time):
            raise serializers.ValidationError("Past slots cannot be booked")

        patient = self.context["patient"]
        if patient_has_slot_conflict(
            patient,
            slot.availability.date,
            slot.start_time,
            slot.end_time,
        ):
            raise serializers.ValidationError(
                "You already have an appointment in this time slot."
            )

        attrs["slot"] = slot
        attrs["wallet_amount"] = money(attrs.get("wallet_amount") or 0)
        return attrs

    def create(self, validated_data):
        patient = self.context["patient"]
        slot = validated_data["slot"]
        requested_wallet_amount = validated_data["wallet_amount"]
        availability = slot.availability
        psychologist = availability.psychologist
        amounts = calculate_booking_amounts(psychologist)
        total_amount = amounts["total_amount"]
        max_wallet_amount = total_amount
        wallet_amount = min(requested_wallet_amount, max_wallet_amount)
        razorpay_amount = money(total_amount - wallet_amount)

        razorpay_order = None

        with transaction.atomic():
            locked_slot = AvailableSlot.objects.select_for_update().get(id=slot.id)

            if locked_slot.is_booked:
                raise serializers.ValidationError("Slot already booked")

            locked_availability = locked_slot.availability
            if patient_has_slot_conflict(
                patient,
                locked_availability.date,
                locked_slot.start_time,
                locked_slot.end_time,
            ):
                raise serializers.ValidationError(
                    "You already have an appointment in this time slot."
                )

            patient_wallet = get_wallet(patient.user)
            locked_wallet = None
            if wallet_amount > 0:
                locked_wallet = patient_wallet.__class__.objects.select_for_update().get(id=patient_wallet.id)
                if locked_wallet.balance < wallet_amount:
                    raise serializers.ValidationError("Insufficient wallet balance.")

            locked_slot.is_booked = True
            locked_slot.save(update_fields=["is_booked"])
            booking = Booking.objects.create(
                patient=patient,
                psychologist=psychologist,
                slot=locked_slot,
                date=availability.date,
                start_time=locked_slot.start_time,
                end_time=locked_slot.end_time,
                status="PENDING" if razorpay_amount > 0 else "CONFIRMED",
                payment_status="PENDING",
                consultation_fee=amounts["consultation_fee"],
                gst_amount=amounts["gst_amount"],
                total_amount=total_amount,
                wallet_amount=wallet_amount,
                razorpay_amount=razorpay_amount,
            )
            create_consultation_for_booking(booking)
            if wallet_amount > 0 and locked_wallet:
                debit_wallet(
                    locked_wallet,
                    wallet_amount,
                    "APPOINTMENT_HOLD",
                    booking=booking,
                    note="Held for appointment payment.",
                )

            if razorpay_amount == 0:
                credit_admin_for_booking(booking, reference="wallet")
            else:
                razorpay_order = create_razorpay_order(
                    patient.user,
                    "APPOINTMENT_PAYMENT",
                    razorpay_amount,
                    booking=booking,
                    notes={"booking_id": str(booking.id)},
                )

        if booking.payment_status == "PAID":
            notify_booking_confirmed(booking)

        if razorpay_order:
            return {"booking": booking, "razorpay_order": razorpay_order}

        return {"booking": booking, "razorpay_order": None}


def notify_booking_confirmed(booking):
    ensure_chat_room_for_booking(booking)
    slot_label = format_india_slot(booking.date, booking.start_time)
    create_notification(
        booking.psychologist.user,
        f"New appointment booked by {booking.patient.user.full_name} for {slot_label}.",
        target_url="/psychologist/appointments",
    )
    create_notification(
        booking.patient.user,
        f"Your appointment with {booking.psychologist.user.full_name} is confirmed for {slot_label}.",
        target_url=f"/patient/appointments/{booking.id}",
    )


"""
CANCEL BOOKING
"""
class CancelBookingSerializer(serializers.Serializer):
    note = serializers.CharField(trim_whitespace=True)

    def validate_note(self, value):
        if not value.strip():
            raise serializers.ValidationError("Cancellation note is required")
        return value.strip()

    def save(self, **kwargs):
        booking = self.context["booking"]
        cancelled_by = self.context.get("cancelled_by")
        note = self.validated_data["note"]

        with transaction.atomic():
            locked_booking = Booking.objects.select_for_update().get(id=booking.id)

            if locked_booking.status == "CANCELLED":
                raise serializers.ValidationError("Booking already cancelled")

            if locked_booking.status == "COMPLETED":
                raise serializers.ValidationError("Completed booking cannot be cancelled")

            if locked_booking.slot_id:
                locked_slot = AvailableSlot.objects.select_for_update().get(
                    id=locked_booking.slot_id
                )
                locked_slot.is_booked = False
                locked_slot.save(update_fields=["is_booked"])

            locked_booking.slot = None
            locked_booking.status = "CANCELLED"
            locked_booking.notes = note
            locked_booking.cancelled_by = cancelled_by
            locked_booking.save(update_fields=["slot", "status", "notes", "cancelled_by"])
            refund_booking_to_patient(locked_booking, note=note)

        sync_chat_room_for_booking(locked_booking)
        slot_label = format_india_slot(locked_booking.date, locked_booking.start_time)
        create_notification(
            locked_booking.patient.user,
            f"Your appointment with {locked_booking.psychologist.user.full_name} for {slot_label} was cancelled.",
            target_url=f"/patient/appointments/{locked_booking.id}",
        )
        create_notification(
            locked_booking.psychologist.user,
            f"Appointment with {locked_booking.patient.user.full_name} for {slot_label} was cancelled.",
            target_url="/psychologist/appointments",
        )
        return locked_booking


"""
COMPLETE BOOKING
"""
class CompleteBookingSerializer(serializers.Serializer):
    def save(self, **kwargs):
        booking = self.context["booking"]
        completed_consultation = None

        with transaction.atomic():
            locked_booking = Booking.objects.select_for_update().get(id=booking.id)

            if locked_booking.status == "CANCELLED":
                raise serializers.ValidationError("Cancelled booking cannot be completed")

            if locked_booking.status == "COMPLETED":
                return locked_booking

            complete_booking_payment(locked_booking)
            locked_booking.status = "COMPLETED"
            locked_booking.save(update_fields=["status"])
            if hasattr(locked_booking, "consultation_session"):
                consultation = locked_booking.consultation_session
                consultation.status = "COMPLETED"
                consultation.ended_at = timezone.now()
                consultation.save(update_fields=["status", "ended_at", "updated_at"])
                completed_consultation = consultation

        sync_chat_room_for_booking(locked_booking)
        if completed_consultation:
            update_patient_summary_for_consultation(completed_consultation)
        return locked_booking


"""
RESCHEDULE BOOKING
"""
class RescheduleBookingSerializer(serializers.Serializer):
    slot_id = serializers.UUIDField()
    note = serializers.CharField(trim_whitespace=True)

    def validate_note(self, value):
        if not value.strip():
            raise serializers.ValidationError("Reschedule note is required")
        return value.strip()

    def validate(self, attrs):
        booking = self.context["booking"]

        try:
            slot = AvailableSlot.objects.select_related("availability").get(
                id=attrs["slot_id"]
            )
        except AvailableSlot.DoesNotExist:
            raise serializers.ValidationError("Invalid slot")

        if slot.id == booking.slot_id:
            raise serializers.ValidationError("Choose a different slot to reschedule")

        if slot.availability.psychologist_id != booking.psychologist_id:
            raise serializers.ValidationError("Slot does not belong to this psychologist")

        if slot.is_booked:
            raise serializers.ValidationError("Selected slot is already booked")

        if not is_future_slot(slot.availability.date, slot.start_time):
            raise serializers.ValidationError("Past slots cannot be selected")

        if patient_has_slot_conflict(
            booking.patient,
            slot.availability.date,
            slot.start_time,
            slot.end_time,
            exclude_booking=booking,
        ):
            raise serializers.ValidationError(
                "Patient already has an appointment in this time slot"
            )

        if not is_slot_after_booking(slot, booking):
            raise serializers.ValidationError(
                "Reschedule is only allowed to slots after the current appointment time"
            )

        attrs["slot"] = slot
        return attrs

    def save(self, **kwargs):
        booking = self.context["booking"]
        new_slot = self.validated_data["slot"]
        note = self.validated_data["note"]

        with transaction.atomic():
            locked_booking = Booking.objects.select_for_update().get(id=booking.id)
            locked_new_slot = AvailableSlot.objects.select_for_update().select_related(
                "availability"
            ).get(id=new_slot.id)

            if locked_booking.status == "CANCELLED":
                raise serializers.ValidationError("Cancelled booking cannot be rescheduled")

            if locked_booking.status == "COMPLETED":
                raise serializers.ValidationError("Completed booking cannot be rescheduled")

            if not locked_booking.slot_id:
                raise serializers.ValidationError("Booking does not have an active slot")

            if locked_new_slot.is_booked:
                raise serializers.ValidationError("Selected slot is already booked")

            if patient_has_slot_conflict(
                locked_booking.patient,
                locked_new_slot.availability.date,
                locked_new_slot.start_time,
                locked_new_slot.end_time,
                exclude_booking=locked_booking,
            ):
                raise serializers.ValidationError(
                    "Patient already has an appointment in this time slot"
                )

            old_slot = AvailableSlot.objects.select_for_update().get(
                id=locked_booking.slot_id
            )
            old_slot.is_booked = False
            old_slot.save(update_fields=["is_booked"])

            locked_new_slot.is_booked = True
            locked_new_slot.save(update_fields=["is_booked"])

            locked_booking.slot = locked_new_slot
            locked_booking.date = locked_new_slot.availability.date
            locked_booking.start_time = locked_new_slot.start_time
            locked_booking.end_time = locked_new_slot.end_time
            locked_booking.status = "CONFIRMED"
            locked_booking.notes = note
            locked_booking.save(
                update_fields=[
                    "slot",
                    "date",
                    "start_time",
                    "end_time",
                    "status",
                    "notes",
                ]
            )

        sync_chat_room_for_booking(locked_booking)
        slot_label = format_india_slot(locked_booking.date, locked_booking.start_time)
        create_notification(
            locked_booking.patient.user,
            f"Your appointment with {locked_booking.psychologist.user.full_name} was rescheduled to {slot_label}.",
            target_url=f"/patient/appointments/{locked_booking.id}",
        )
        return locked_booking
