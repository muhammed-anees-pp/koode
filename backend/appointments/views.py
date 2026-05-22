from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.conf import settings
from .models import Availability, Booking
from django.db.models import Count, Q
from django.utils import timezone
from zoneinfo import ZoneInfo
from admin_panel.permissions import IsAdminUserRole
from psychologists.models import PsychologistProfile
from patients.models import PatientProfile
from patients.permissions import IsPatient
from psychologists.permissions import IsPsychologist
from .serializers import (
    AvailabilitySerializer, BookingSerializer, CancelBookingSerializer, CompleteBookingSerializer, CreateAvailabilitySerializer, 
    CreateBookingSerializer, RescheduleBookingSerializer, RevokeAvailabilitySlotSerializer, is_future_slot,
)
from finance.services.amounts import calculate_psychologist_payout


INDIA_TZ = ZoneInfo("Asia/Kolkata")


def admin_appointment_payload(booking, request):
    consultation = getattr(booking, "consultation_session", None)
    review = getattr(booking, "review", None)
    complaint = getattr(booking, "complaint", None)
    payout = calculate_psychologist_payout(booking)

    patient_photo = booking.patient.user.profile_picture
    psychologist_photo = booking.psychologist.user.profile_picture
    try:
        patient_photo_url = request.build_absolute_uri(patient_photo.url) if patient_photo else None
    except Exception:
        patient_photo_url = None
    try:
        psychologist_photo_url = request.build_absolute_uri(psychologist_photo.url) if psychologist_photo else None
    except Exception:
        psychologist_photo_url = None

    specializations = [item.name for item in booking.psychologist.specializations.all()]

    return {
        "id": str(booking.id),
        "date": booking.date,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "status": booking.status,
        "payment_status": booking.payment_status,
        "consultation_fee": booking.consultation_fee,
        "gst_amount": booking.gst_amount,
        "total_amount": booking.total_amount,
        "wallet_amount": booking.wallet_amount,
        "razorpay_amount": booking.razorpay_amount,
        "admin_commission_amount": payout["commission_amount"],
        "psychologist_payout_amount": payout["psychologist_payout"],
        "psychologist_paid_at": booking.psychologist_paid_at,
        "meeting_link": booking.meeting_link,
        "cancellation_note": booking.notes,
        "cancelled_by": {
            "id": str(booking.cancelled_by.id),
            "role": booking.cancelled_by.role,
            "full_name": booking.cancelled_by.full_name,
        } if booking.cancelled_by else None,
        "created_at": booking.created_at,
        "patient": {
            "patient_id": booking.patient.patient_id,
            "full_name": booking.patient.user.full_name,
            "email": booking.patient.user.email,
            "phone_number": booking.patient.phone_number or None,
            "profile_picture": patient_photo_url,
        },
        "psychologist": {
            "psychologist_id": booking.psychologist.psychologist_id,
            "full_name": booking.psychologist.user.full_name,
            "email": booking.psychologist.user.email,
            "phone_number": booking.psychologist.phone_number or None,
            "specialization": ", ".join(specializations) if specializations else booking.psychologist.job_title,
            "profile_picture": psychologist_photo_url,
        },
        "consultation": {
            "id": str(consultation.id) if consultation else None,
            "room_id": consultation.room_id if consultation else None,
            "status": consultation.status if consultation else None,
            "started_at": consultation.started_at if consultation else None,
            "ended_at": consultation.ended_at if consultation else None,
            "patient_note": consultation.patient_note if consultation else "",
            "psychologist_note": consultation.psychologist_note if consultation else "",
        },
        "review": {
            "id": str(review.id),
            "rating": review.rating,
            "review": review.review,
            "submitted_at": review.submitted_at,
        } if review else None,
        "complaint": {
            "id": str(complaint.id),
            "complaint_id": complaint.complaint_id,
            "status": complaint.status,
            "status_display": complaint.get_status_display(),
            "subject": complaint.subject,
        } if complaint else None,
    }


"""
ADMIN APPOINTMENT LIST
"""
class AdminAppointmentListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]

    def get(self, request):
        tab = request.query_params.get("tab", "upcoming").strip().lower()
        search = request.query_params.get("search", "").strip()
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))

        queryset = Booking.objects.select_related(
            "patient__user",
            "psychologist__user",
            "cancelled_by",
            "consultation_session",
            "review",
            "complaint",
        ).prefetch_related("psychologist__specializations")

        if tab == "past":
            queryset = queryset.filter(status="COMPLETED")
            ordering = ("-date", "-start_time", "-created_at")
        elif tab == "cancelled":
            queryset = queryset.filter(status="CANCELLED")
            ordering = ("-date", "-start_time", "-created_at")
        else:
            queryset = queryset.exclude(status__in=["COMPLETED", "CANCELLED"])
            ordering = ("date", "start_time", "created_at")

        if search:
            queryset = queryset.filter(
                Q(id__icontains=search)
                | Q(patient__patient_id__icontains=search)
                | Q(patient__user__full_name__icontains=search)
                | Q(patient__user__email__icontains=search)
                | Q(psychologist__psychologist_id__icontains=search)
                | Q(psychologist__user__full_name__icontains=search)
                | Q(psychologist__user__email__icontains=search)
            )

        queryset = queryset.order_by(*ordering)
        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        appointments = queryset[start:end]

        summary = Booking.objects.aggregate(
            upcoming=Count("id", filter=~Q(status__in=["COMPLETED", "CANCELLED"])),
            past=Count("id", filter=Q(status="COMPLETED")),
            cancelled=Count("id", filter=Q(status="CANCELLED")),
        )

        return Response({
            "summary": {
                "upcoming": summary["upcoming"] or 0,
                "past": summary["past"] or 0,
                "cancelled": summary["cancelled"] or 0,
            },
            "results": [admin_appointment_payload(booking, request) for booking in appointments],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }, status=status.HTTP_200_OK)


"""
ADMIN APPOINTMENT DETAIL
"""
class AdminAppointmentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUserRole]

    def get(self, request, booking_id):
        booking = get_object_or_404(
            Booking.objects.select_related(
                "patient__user",
                "psychologist__user",
                "cancelled_by",
                "consultation_session",
                "review",
                "complaint",
            ).prefetch_related("psychologist__specializations"),
            id=booking_id,
        )
        return Response(admin_appointment_payload(booking, request), status=status.HTTP_200_OK)



"""
CREATE AVAILABILITY
"""
class CreateAvailabilityView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    def post(self, request):
        psychologist = get_object_or_404(PsychologistProfile, user=request.user)
        serializer = CreateAvailabilitySerializer(data=request.data, context={"psychologist": psychologist})

        if serializer.is_valid():
            availabilities = serializer.save()
            return Response(
                AvailabilitySerializer(availabilities, many=True).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


"""
REVOKE AVAILABILITY SLOT
"""
class RevokeAvailabilitySlotView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    def post(self, request):
        psychologist = get_object_or_404(PsychologistProfile, user=request.user)
        serializer = RevokeAvailabilitySlotSerializer(
            data=request.data,
            context={"psychologist": psychologist},
        )

        if serializer.is_valid():
            availability = serializer.save()
            if availability is None:
                return Response({"detail": "Slot revoked successfully.", "availability": None})

            return Response({
                "detail": "Slot revoked successfully.",
                "availability": AvailabilitySerializer(availability).data,
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


"""
LIST OWN AVAILABILITY
"""
class PsychologistAvailabilityListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    def get(self, request):
        psychologist = get_object_or_404(PsychologistProfile, user=request.user)
        qs = Availability.objects.filter(psychologist=psychologist).prefetch_related("slots").order_by("date")
        qs = [
            availability for availability in qs
            if any(is_future_slot(availability.date, slot.start_time) for slot in availability.slots.all())
        ]
        serializer = AvailabilitySerializer(qs, many=True)
        return Response(serializer.data)


"""
VIEW PSYCHOLOGIST SLOTS
"""
class PsychologistSlotListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, psychologist_id):
        psychologist = get_object_or_404(PsychologistProfile, psychologist_id=psychologist_id)
        date = request.query_params.get("date")
        qs = Availability.objects.filter(psychologist=psychologist)
        if date:
            qs = qs.filter(date=date)

        qs = qs.prefetch_related("slots").order_by("date")
        qs = [
            availability for availability in qs
            if any(is_future_slot(availability.date, slot.start_time) for slot in availability.slots.all())
        ]
        serializer = AvailabilitySerializer(qs, many=True)
        return Response(serializer.data)


"""
CREATE BOOKING
"""
class CreateBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def post(self, request):
        patient = get_object_or_404(PatientProfile, user=request.user)
        serializer = CreateBookingSerializer(data=request.data, context={"patient": patient},)

        if serializer.is_valid():
            result = serializer.save()
            booking = result["booking"]
            razorpay_order = result["razorpay_order"]
            data = {
                "booking": BookingSerializer(booking, context={"request": request}).data,
                "payment_required": razorpay_order is not None,
            }
            if razorpay_order:
                data["razorpay"] = {
                    "key": getattr(settings, "RAZORPAY_KEY_ID", ""),
                    "order_id": razorpay_order.razorpay_order_id,
                    "amount": int(razorpay_order.amount * 100),
                    "currency": razorpay_order.currency,
                }
            return Response(data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


"""
LIST BOOKINGS
"""
class BookingListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role == "PATIENT":
            patient = get_object_or_404(PatientProfile, user=request.user)
            queryset = Booking.objects.filter(patient=patient)
        elif request.user.role == "PSYCHOLOGIST":
            psychologist = get_object_or_404(PsychologistProfile, user=request.user)
            queryset = Booking.objects.filter(psychologist=psychologist)
        else:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        queryset = queryset.select_related(
            "slot",
            "psychologist__user",
            "patient__user",
            "patient__summary_report",
            "consultation_session",
            "review",
            "complaint",
        ).order_by("date", "start_time", "end_time", "created_at")

        serializer = BookingSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)


"""
BOOKING VIEW
"""
class BookingActionBaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_booking(self, request, booking_id):
        booking = get_object_or_404(Booking.objects.select_related("patient__user", "patient__summary_report", "psychologist__user", "slot", "consultation_session", "review", "complaint"),id=booking_id,)

        if request.user.role == "PATIENT":
            patient = get_object_or_404(PatientProfile, user=request.user)
            if booking.patient_id != patient.patient_id:
                return None
        elif request.user.role == "PSYCHOLOGIST":
            psychologist = get_object_or_404(PsychologistProfile, user=request.user)
            if booking.psychologist_id != psychologist.psychologist_id:
                return None
        else:
            return None

        return booking

    def ensure_upcoming(self, booking):
        return booking.date >= timezone.localtime(timezone.now(), INDIA_TZ).date()


"""
CANCEL BOOKING
"""
class CancelBookingView(BookingActionBaseView):
    def post(self, request, booking_id):
        booking = self.get_booking(request, booking_id)
        if booking is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        if not self.ensure_upcoming(booking):
            return Response(
                {"detail": "Only upcoming bookings can be cancelled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CancelBookingSerializer(data=request.data, context={"booking": booking, "cancelled_by": request.user},)

        if serializer.is_valid():
            booking = serializer.save()
            return Response(BookingSerializer(booking, context={"request": request}).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


"""
RESCHEDULE BOOKING
"""
class RescheduleBookingView(BookingActionBaseView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    def post(self, request, booking_id):
        booking = self.get_booking(request, booking_id)
        if booking is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        if not self.ensure_upcoming(booking):
            return Response(
                {"detail": "Only upcoming bookings can be rescheduled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RescheduleBookingSerializer(data=request.data, context={"booking": booking},)

        if serializer.is_valid():
            booking = serializer.save()
            return Response(BookingSerializer(booking, context={"request": request}).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


"""
COMPLETE BOOKING
"""
class CompleteBookingView(BookingActionBaseView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    def post(self, request, booking_id):
        booking = self.get_booking(request, booking_id)
        if booking is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        serializer = CompleteBookingSerializer(data=request.data, context={"booking": booking})
        if serializer.is_valid():
            booking = serializer.save()
            return Response(BookingSerializer(booking, context={"request": request}).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
