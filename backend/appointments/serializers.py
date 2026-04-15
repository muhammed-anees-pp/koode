from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from .models import Availability, AvailableSlot, Booking

INDIA_TZ = ZoneInfo("Asia/Kolkata")


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


"""
AVAILABLE SLOT SERIALIZER
"""
class AvailableSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailableSlot
        fields = [
            "id",
            "start_time",
            "end_time",
            "is_booked",
        ]

"""
AVAILABILITY SERIALIZER
"""
class AvailabilitySerializer(serializers.ModelSerializer):
    slots = serializers.SerializerMethodField()

    def get_slots(self, obj):
        future_slots = [
            slot for slot in obj.slots.all()
            if is_future_slot(obj.date, slot.start_time)
        ]
        return AvailableSlotSerializer(future_slots, many=True).data

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
    date = serializers.DateField()
    slots = serializers.ListField(child=serializers.DictField(),allow_empty=False)

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
        date = attrs["date"]
        slots = attrs["slots"]
        cutoff = datetime.now(INDIA_TZ) + timedelta(hours=24)

        for slot in slots:
            start_time = slot["start_time"]
            if isinstance(start_time, str):
                start_time = datetime.strptime(start_time, "%H:%M").time()

            slot_start = datetime.combine(date, start_time, tzinfo=INDIA_TZ)
            if slot_start <= cutoff:
                raise serializers.ValidationError(
                    "Availability can only be added for slots more than 24 hours in advance"
                )

        return attrs

    def create(self, validated_data):
        psychologist = self.context["psychologist"]
        date = validated_data["date"]
        slots_data = validated_data["slots"]

        with transaction.atomic():
            availability, created = Availability.objects.get_or_create(psychologist=psychologist,date=date)
            created_slots = []

            for slot in slots_data:
                slot_obj, _ = AvailableSlot.objects.get_or_create(availability=availability, start_time=slot["start_time"], end_time=slot["end_time"],)
                created_slots.append(slot_obj)

        return availability


"""
BOOKING SERIALIZER
"""
class BookingSerializer(serializers.ModelSerializer):
    slot = AvailableSlotSerializer(read_only=True)
    patient_name = serializers.CharField(source="patient.user.full_name", read_only=True)
    psychologist_name = serializers.CharField(source="psychologist.user.full_name", read_only=True)
    psychologist_photo = serializers.SerializerMethodField()
    psychologist_id = serializers.CharField(source="psychologist.psychologist_id", read_only=True)
    specialization = serializers.SerializerMethodField()
    cancellation_note = serializers.CharField(source="notes", read_only=True)

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

    def get_specialization(self, obj):
        specs = obj.psychologist.specializations.all()
        if specs.exists():
            return specs.first().name
        return None

    class Meta:
        model = Booking
        fields = [
            "id",
            "patient",
            "patient_name",
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
            "meeting_link",
            "cancellation_note",
            "slot",
            "created_at",
        ]
        read_only_fields = fields


"""
CREATE BOOKING
"""
class CreateBookingSerializer(serializers.Serializer):
    slot_id = serializers.UUIDField()

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

        attrs["slot"] = slot
        return attrs

    def create(self, validated_data):
        patient = self.context["patient"]
        slot = validated_data["slot"]
        availability = slot.availability
        psychologist = availability.psychologist

        with transaction.atomic():
            locked_slot = AvailableSlot.objects.select_for_update().get(id=slot.id)

            if locked_slot.is_booked:
                raise serializers.ValidationError("Slot already booked")

            locked_slot.is_booked = True
            locked_slot.save(update_fields=["is_booked"])
            booking = Booking.objects.create(
                patient=patient,
                psychologist=psychologist,
                slot=locked_slot,
                date=availability.date,
                start_time=locked_slot.start_time,
                end_time=locked_slot.end_time,
                status="CONFIRMED",
            )

        return booking


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
        note = self.validated_data["note"]

        with transaction.atomic():
            locked_booking = Booking.objects.select_for_update().select_related("slot").get(
                id=booking.id
            )

            if locked_booking.status == "CANCELLED":
                raise serializers.ValidationError("Booking already cancelled")

            if locked_booking.status == "COMPLETED":
                raise serializers.ValidationError("Completed booking cannot be cancelled")

            if locked_booking.slot_id:
                locked_booking.slot.is_booked = False
                locked_booking.slot.save(update_fields=["is_booked"])

            locked_booking.slot = None
            locked_booking.status = "CANCELLED"
            locked_booking.notes = note
            locked_booking.save(update_fields=["slot", "status", "notes"])

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
            locked_booking = Booking.objects.select_for_update().select_related("slot").get(
                id=booking.id
            )
            old_slot = AvailableSlot.objects.select_for_update().get(id=locked_booking.slot_id)
            locked_new_slot = AvailableSlot.objects.select_for_update().select_related(
                "availability"
            ).get(id=new_slot.id)

            if locked_booking.status == "CANCELLED":
                raise serializers.ValidationError("Cancelled booking cannot be rescheduled")

            if locked_booking.status == "COMPLETED":
                raise serializers.ValidationError("Completed booking cannot be rescheduled")

            if locked_new_slot.is_booked:
                raise serializers.ValidationError("Selected slot is already booked")

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

        return locked_booking
