from django.db.models import Count, Q
from django.utils.dateparse import parse_date
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from admin_panel.permissions import IsAdminUserRole
from appointments.models import Booking
from complaints.models import Complaint
from complaints.serializers import (
    AdminComplaintActionSerializer, ComplaintSerializer, CreateComplaintSerializer, EligibleComplaintBookingSerializer,
    PsychologistComplaintResponseSerializer, PsychologistComplaintSerializer,
)
from complaints.services import complaint_eligibility_for_booking
from patients.models import PatientProfile
from patients.permissions import IsPatient
from psychologists.models import PsychologistProfile
from psychologists.permissions import IsPsychologist



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


def apply_complaint_status_filter(queryset, complaint_status):
    if not complaint_status or complaint_status == "ALL":
        return queryset
    if complaint_status == "OPEN":
        return queryset.exclude(
            status__in=[
                Complaint.STATUS_RESOLVED,
                Complaint.STATUS_REJECTED,
            ]
        )
    return queryset.filter(status=complaint_status)


def psychologist_visible_complaints(psychologist):
    return complaint_queryset().filter(
        booking__psychologist=psychologist,
        show_to_psychologist=True,
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
        queryset = apply_complaint_status_filter(queryset, complaint_status)

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


"""
ADMIN COMPLAINT LIST VIEW
"""
class AdminComplaintListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        complaint_status = request.query_params.get("status", "").strip()
        category = request.query_params.get("category", "").strip()
        severity = request.query_params.get("severity", "").strip()
        date = parse_date(request.query_params.get("date", "").strip())
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))

        queryset = complaint_queryset()
        if search:
            queryset = queryset.filter(
                Q(complaint_id__icontains=search)
                | Q(subject__icontains=search)
                | Q(patient__user__full_name__icontains=search)
                | Q(patient__user__email__icontains=search)
                | Q(psychologist__user__full_name__icontains=search)
                | Q(psychologist__user__email__icontains=search)
            )
        queryset = apply_complaint_status_filter(queryset, complaint_status)
        if category and category != "ALL":
            queryset = queryset.filter(category=category)
        if severity and severity != "ALL":
            queryset = queryset.filter(severity=severity)
        if date:
            queryset = queryset.filter(created_at__date=date)

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        serializer = ComplaintSerializer(queryset[start:end], many=True, context={"request": request})
        counts = complaint_queryset().aggregate(
            open=Count("id", filter=~Q(status__in=[Complaint.STATUS_RESOLVED, Complaint.STATUS_REJECTED])),
            pending_review=Count("id", filter=Q(status=Complaint.STATUS_PENDING)),
            under_review=Count("id", filter=Q(status=Complaint.STATUS_UNDER_REVIEW)),
            response_submitted=Count("id", filter=Q(status=Complaint.STATUS_PSYCHOLOGIST_RESPONSE_SUBMITTED)),
            resolved=Count("id", filter=Q(status=Complaint.STATUS_RESOLVED)),
            rejected=Count("id", filter=Q(status=Complaint.STATUS_REJECTED)),
            high_priority=Count("id", filter=Q(severity=Complaint.SEVERITY_HIGH)),
        )
        return Response({
            "results": serializer.data,
            "stats": counts,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        })


"""
ADMIN COMPLAINT DETAILS VIEW
"""
class AdminComplaintDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def get(self, request, complaint_id):
        complaint = get_object_or_404(complaint_queryset(), id=complaint_id)
        serializer = ComplaintSerializer(complaint, context={"request": request})
        return Response(serializer.data)

    def patch(self, request, complaint_id):
        complaint = get_object_or_404(complaint_queryset(), id=complaint_id)
        serializer = AdminComplaintActionSerializer(
            complaint,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save()
        response_serializer = ComplaintSerializer(complaint, context={"request": request})
        return Response(response_serializer.data)


"""
PSYCHOLOGIST COMPLAINT LIST VIEW
"""
class PsychologistComplaintListView(APIView):
    permission_classes = [IsAuthenticated, IsPsychologist]

    def get(self, request):
        psychologist = get_object_or_404(PsychologistProfile, user=request.user)
        search = request.query_params.get("search", "").strip()
        complaint_status = request.query_params.get("status", "ALL").strip()

        queryset = psychologist_visible_complaints(psychologist)
        if search:
            queryset = queryset.filter(
                Q(complaint_id__icontains=search)
                | Q(subject__icontains=search)
                | Q(patient__user__full_name__icontains=search)
            )
        queryset = apply_complaint_status_filter(queryset, complaint_status)

        serializer = PsychologistComplaintSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)


"""
PSYCHOLOGIST COMPLAINT DETAILS VIEW
"""
class PsychologistComplaintDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPsychologist]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_complaint(self, request, complaint_id):
        psychologist = get_object_or_404(PsychologistProfile, user=request.user)
        return get_object_or_404(
            psychologist_visible_complaints(psychologist),
            id=complaint_id,
        )

    def get(self, request, complaint_id):
        complaint = self.get_complaint(request, complaint_id)
        serializer = PsychologistComplaintSerializer(complaint, context={"request": request})
        return Response(serializer.data)

    def post(self, request, complaint_id):
        complaint = self.get_complaint(request, complaint_id)
        if complaint.status != Complaint.STATUS_UNDER_REVIEW:
            return Response(
                {"detail": "Response can only be submitted while the complaint is under review."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = request.data.copy()
        if "evidence" not in data:
            files = request.FILES.getlist("evidence")
            if files:
                if hasattr(data, "setlist"):
                    data.setlist("evidence", files)
                else:
                    data["evidence"] = files

        serializer = PsychologistComplaintResponseSerializer(
            complaint,
            data=data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save()
        response_serializer = PsychologistComplaintSerializer(complaint, context={"request": request})
        return Response(response_serializer.data)
