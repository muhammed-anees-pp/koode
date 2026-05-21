from django.db.models import Count, Q
from django.utils.dateparse import parse_date
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from appointments.models import Booking
from complaints.models import Complaint
from complaints.serializers import (
    ComplaintSerializer, CreateComplaintSerializer, EligibleComplaintBookingSerializer, 
)
from complaints.services import complaint_eligibility_for_booking
from patients.models import PatientProfile
from patients.permissions import IsPatient



def complaint_queryset():
    return Complaint.objects.select_related(
        "booking__consultation_session",
        "patient__user",
        "psychologist__user",
    ).prefetch_related(
        "attachments",
        "psychologist_attachments",
        "timeline__actor",
    )


"""
PATIENT SIDE COMPLAINT OPTION
"""
class EligibleComplaintBookingListView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request):
        patient = get_object_or_404(PatientProfile, user=request.user)
        bookings = Booking.objects.filter(
            patient=patient, status="COMPLETED", consultation_session__ended_at__isnull=False,
        ).select_related(
            "patient__user",
            "psychologist__user",
            "consultation_session",
            "complaint",
        ).order_by("-date", "-start_time")

        eligible = [
            booking for booking in bookings
            if complaint_eligibility_for_booking(booking, patient=patient)["can_raise"]
        ]
        serializer = EligibleComplaintBookingSerializer(
            eligible,
            many=True,
            context={"request": request, "patient": patient},
        )
        return Response(serializer.data)


"""
PATIENT CREATE COMPLETE
"""
class BookingComplaintCreateView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request, booking_id):
        patient = get_object_or_404(PatientProfile, user=request.user)
        booking = get_object_or_404(
            Booking.objects.select_related(
                "patient__user",
                "psychologist__user",
                "consultation_session",
                "complaint",
            ),
            id=booking_id,
            patient=patient,
        )
        data = request.data.copy()
        if "evidence" not in data:
            files = request.FILES.getlist("evidence")
            if files:
                if hasattr(data, "setlist"):
                    data.setlist("evidence", files)
                else:
                    data["evidence"] = files

        serializer = CreateComplaintSerializer(
            data=data,
            context={"request": request, "booking": booking, "patient": patient},
        )
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save()
        response_serializer = ComplaintSerializer(complaint, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


"""
PATIENT COMPLAINTS LIST VIEW
"""
class PatientComplaintListView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request):
        patient = get_object_or_404(PatientProfile, user=request.user)
        search = request.query_params.get("search", "").strip()
        complaint_status = request.query_params.get("status", "").strip()

        queryset = complaint_queryset().filter(patient=patient)
        if search:
            queryset = queryset.filter(
                Q(complaint_id__icontains=search)
                | Q(subject__icontains=search)
                | Q(psychologist__user__full_name__icontains=search)
            )
        if complaint_status and complaint_status != "ALL":
            queryset = queryset.filter(status=complaint_status)

        serializer = ComplaintSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)


"""
PATIENT COMPLAINT DETAILS VIEW
"""
class PatientComplaintDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request, complaint_id):
        patient = get_object_or_404(PatientProfile, user=request.user)
        complaint = get_object_or_404(complaint_queryset(), id=complaint_id, patient=patient)
        serializer = ComplaintSerializer(complaint, context={"request": request})
        return Response(serializer.data)



