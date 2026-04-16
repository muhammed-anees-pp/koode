import logging
from functools import wraps
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import APIException
from django.http import Http404
from django.shortcuts import get_object_or_404
from .models import Availability, Booking
from django.utils import timezone
from psychologists.models import PsychologistProfile
from patients.models import PatientProfile
from patients.permissions import IsPatient
from psychologists.permissions import IsPsychologist
from notifications.services import create_notification
from .serializers import (
    AvailabilitySerializer, BookingSerializer, CancelBookingSerializer, CreateAvailabilitySerializer, CreateBookingSerializer, RescheduleBookingSerializer, is_future_slot,
)


logger = logging.getLogger(__name__)


def log_unexpected_errors(action):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except (APIException, Http404):
                raise
            except Exception as exc:
                logger.exception("Unexpected error while %s", action)
                raise APIException("Something went wrong. Please try again later.") from exc

        return wrapper

    return decorator


def send_booking_notification(recipient, message, booking_id):
    try:
        create_notification(recipient, message)
    except Exception:
        logger.exception(
            "Failed to create appointment notification for booking %s and user %s",
            booking_id,
            getattr(recipient, "id", None),
        )



"""
CREATE AVAILABILITY
"""
class CreateAvailabilityView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    @log_unexpected_errors("creating availability")
    def post(self, request):
        psychologist = get_object_or_404(PsychologistProfile, user=request.user)
        serializer = CreateAvailabilitySerializer(data=request.data, context={"psychologist": psychologist})
        serializer.is_valid(raise_exception=True)
        availability = serializer.save()

        logger.info(
            "Availability created for psychologist %s on %s",
            psychologist.psychologist_id,
            availability.date,
        )

        return Response(
            AvailabilitySerializer(availability).data,
            status=status.HTTP_201_CREATED
        )


"""
LIST OWN AVAILABILITY
"""
class PsychologistAvailabilityListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    @log_unexpected_errors("listing psychologist availability")
    def get(self, request):
        psychologist = get_object_or_404(PsychologistProfile, user=request.user)
        qs = Availability.objects.filter(psychologist=psychologist).prefetch_related("slots").order_by("date")
        qs = [
            availability for availability in qs
            if any(is_future_slot(availability.date, slot.start_time) for slot in availability.slots.all())
        ]
        serializer = AvailabilitySerializer(qs, many=True)
        logger.info(
            "Returned %s availability records for psychologist %s",
            len(qs),
            psychologist.psychologist_id,
        )
        return Response(serializer.data)


"""
VIEW PSYCHOLOGIST SLOTS
"""
class PsychologistSlotListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @log_unexpected_errors("listing psychologist slots")
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
        logger.info(
            "Returned %s public slot records for psychologist %s",
            len(qs),
            psychologist_id,
        )
        return Response(serializer.data)


"""
CREATE BOOKING
"""
class CreateBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    @log_unexpected_errors("creating booking")
    def post(self, request):
        patient = get_object_or_404(PatientProfile, user=request.user)
        serializer = CreateBookingSerializer(data=request.data, context={"patient": patient},)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()

        send_booking_notification(
            booking.patient.user,
            f"Your appointment with {booking.psychologist.user.full_name} is confirmed for {booking.date} at {booking.start_time.strftime('%H:%M')}.",
            booking.id,
        )
        send_booking_notification(
            booking.psychologist.user,
            f"New appointment booked by {booking.patient.user.full_name} for {booking.date} at {booking.start_time.strftime('%H:%M')}.",
            booking.id,
        )

        logger.info(
            "Booking %s created by patient %s with psychologist %s",
            booking.id,
            patient.patient_id,
            booking.psychologist_id,
        )

        return Response(
            BookingSerializer(booking, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


"""
LIST BOOKINGS
"""
class BookingListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @log_unexpected_errors("listing bookings")
    def get(self, request):
        if request.user.role == "PATIENT":
            patient = get_object_or_404(PatientProfile, user=request.user)
            queryset = Booking.objects.filter(patient=patient)
        elif request.user.role == "PSYCHOLOGIST":
            psychologist = get_object_or_404(PsychologistProfile, user=request.user)
            queryset = Booking.objects.filter(psychologist=psychologist)
        else:
            logger.warning("Booking list denied for user %s with role %s", request.user.id, request.user.role)
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        queryset = queryset.select_related(
            "slot",
            "psychologist__user",
            "patient__user",
        ).order_by("-created_at")

        serializer = BookingSerializer(queryset, many=True, context={"request": request})
        logger.info("Returned %s bookings for user %s", queryset.count(), request.user.id)
        return Response(serializer.data)


"""
BOOKING VIEW
"""
class BookingActionBaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @log_unexpected_errors("retrieving booking")
    def get_booking(self, request, booking_id):
        booking = get_object_or_404(Booking.objects.select_related("patient__user", "psychologist__user", "slot"),id=booking_id,)

        if request.user.role == "PATIENT":
            patient = get_object_or_404(PatientProfile, user=request.user)
            if booking.patient_id != patient.patient_id:
                logger.warning("Patient %s tried to access booking %s", patient.patient_id, booking_id)
                return None
        elif request.user.role == "PSYCHOLOGIST":
            psychologist = get_object_or_404(PsychologistProfile, user=request.user)
            if booking.psychologist_id != psychologist.psychologist_id:
                logger.warning("Psychologist %s tried to access booking %s", psychologist.psychologist_id, booking_id)
                return None
        else:
            logger.warning("User %s with role %s tried to access booking %s", request.user.id, request.user.role, booking_id)
            return None

        return booking

    def ensure_upcoming(self, booking):
        return booking.date >= timezone.localdate()


"""
CANCEL BOOKING
"""
class CancelBookingView(BookingActionBaseView):
    @log_unexpected_errors("cancelling booking")
    def post(self, request, booking_id):
        booking = self.get_booking(request, booking_id)
        if booking is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        if not self.ensure_upcoming(booking):
            logger.warning("Cancel denied for past booking %s", booking_id)
            return Response(
                {"detail": "Only upcoming bookings can be cancelled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CancelBookingSerializer(data=request.data, context={"booking": booking},)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()

        if request.user.role == "PATIENT":
            send_booking_notification(
                booking.patient.user,
                f"You cancelled your appointment with {booking.psychologist.user.full_name} scheduled for {booking.date} at {booking.start_time.strftime('%H:%M')}.",
                booking.id,
            )
            send_booking_notification(
                booking.psychologist.user,
                f"{booking.patient.user.full_name} cancelled the appointment scheduled for {booking.date} at {booking.start_time.strftime('%H:%M')}.",
                booking.id,
            )
        else:
            send_booking_notification(
                booking.psychologist.user,
                f"You cancelled the appointment with {booking.patient.user.full_name} scheduled for {booking.date} at {booking.start_time.strftime('%H:%M')}.",
                booking.id,
            )
            send_booking_notification(
                booking.patient.user,
                f"{booking.psychologist.user.full_name} cancelled your appointment scheduled for {booking.date} at {booking.start_time.strftime('%H:%M')}.",
                booking.id,
            )

        logger.info("Booking %s cancelled by user %s", booking.id, request.user.id)

        return Response(BookingSerializer(booking, context={"request": request}).data)


"""
RESCHEDULE BOOKING
"""
class RescheduleBookingView(BookingActionBaseView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    @log_unexpected_errors("rescheduling booking")
    def post(self, request, booking_id):
        booking = self.get_booking(request, booking_id)
        if booking is None:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        if not self.ensure_upcoming(booking):
            logger.warning("Reschedule denied for past booking %s", booking_id)
            return Response(
                {"detail": "Only upcoming bookings can be rescheduled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RescheduleBookingSerializer(data=request.data, context={"booking": booking},)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()

        send_booking_notification(
            booking.psychologist.user,
            f"Appointment with {booking.patient.user.full_name} was rescheduled to {booking.date} at {booking.start_time.strftime('%H:%M')}.",
            booking.id,
        )
        send_booking_notification(
            booking.patient.user,
            f"Your appointment with {booking.psychologist.user.full_name} was rescheduled to {booking.date} at {booking.start_time.strftime('%H:%M')}.",
            booking.id,
        )

        logger.info("Booking %s rescheduled by user %s", booking.id, request.user.id)

        return Response(BookingSerializer(booking, context={"request": request}).data)
