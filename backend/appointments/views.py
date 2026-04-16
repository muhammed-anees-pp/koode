from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
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



"""
CREATE AVAILABILITY
"""
class CreateAvailabilityView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    def post(self, request):
        psychologist = get_object_or_404(PsychologistProfile, user=request.user)
        serializer = CreateAvailabilitySerializer(data=request.data, context={"psychologist": psychologist})

        if serializer.is_valid():
            availability = serializer.save()
            return Response(
                AvailabilitySerializer(availability).data,
                status=status.HTTP_201_CREATED
            )

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
            booking = serializer.save()
            create_notification(
                booking.patient.user,
                f"Your appointment with {booking.psychologist.user.full_name} is confirmed for {booking.date} at {booking.start_time.strftime('%H:%M')}.",
            )
            create_notification(
                booking.psychologist.user,
                f"New appointment booked by {booking.patient.user.full_name} for {booking.date} at {booking.start_time.strftime('%H:%M')}.",
            )
            return Response(
                BookingSerializer(booking, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

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
        ).order_by("-created_at")

        serializer = BookingSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)


"""
BOOKING VIEW
"""
class BookingActionBaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_booking(self, request, booking_id):
        booking = get_object_or_404(Booking.objects.select_related("patient__user", "psychologist__user", "slot"),id=booking_id,)

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
        return booking.date >= timezone.localdate()


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

        serializer = CancelBookingSerializer(data=request.data, context={"booking": booking},)

        if serializer.is_valid():
            booking = serializer.save()
            if request.user.role == "PATIENT":
                create_notification(
                    booking.patient.user,
                    f"You cancelled your appointment with {booking.psychologist.user.full_name} scheduled for {booking.date} at {booking.start_time.strftime('%H:%M')}.",
                )
                create_notification(
                    booking.psychologist.user,
                    f"{booking.patient.user.full_name} cancelled the appointment scheduled for {booking.date} at {booking.start_time.strftime('%H:%M')}.",
                )
            else:
                create_notification(
                    booking.psychologist.user,
                    f"You cancelled the appointment with {booking.patient.user.full_name} scheduled for {booking.date} at {booking.start_time.strftime('%H:%M')}.",
                )
                create_notification(
                    booking.patient.user,
                    f"{booking.psychologist.user.full_name} cancelled your appointment scheduled for {booking.date} at {booking.start_time.strftime('%H:%M')}.",
                )
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
            create_notification(
                booking.psychologist.user,
                f"Appointment with {booking.patient.user.full_name} was rescheduled to {booking.date} at {booking.start_time.strftime('%H:%M')}.",
            )
            create_notification(
                booking.patient.user,
                f"Your appointment with {booking.psychologist.user.full_name} was rescheduled to {booking.date} at {booking.start_time.strftime('%H:%M')}.",
            )
            return Response(BookingSerializer(booking, context={"request": request}).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
