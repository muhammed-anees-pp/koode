from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .serializers import (PsychologistApplicationSerializer, ApplicationSubmitSerializer, AdminUpdateApplicationSerializer, AdminScheduleInterviewSerializer,)
from .services.application_service import ApplicationService
from .repositories.application_repository import ApplicationRepository
from django.db import models
from .models import PsychologistApplication
from django.shortcuts import get_object_or_404
from interviews.services.interview_service import InterviewService
from interviews.repositories.interview_repository import InterviewRepository



############################
####    PSYCHOLOGIST    ####
############################
"""
SUBMIT APPLICATION VIEW
"""
class SubmitApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ApplicationSubmitSerializer(data=request.data)

        if serializer.is_valid():
            application = ApplicationService.submit_application(request.user, serializer.validated_data)
            return Response(
                PsychologistApplicationSerializer(application).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


"""
GET CURRENT APPLICATION
"""
class MyApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        application = ApplicationRepository.get_by_user(request.user)

        if not application:
            return Response(
                {"message": "Application not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PsychologistApplicationSerializer(application)
        return Response(serializer.data)


"""
GET APPLICATION STATUS
"""
class ApplicationStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        application = ApplicationRepository.get_by_user(request.user)
        if not application:
            return Response(
                {"status": "NOT_SUBMITTED"}
            )

        response_data = {
            "status": application.status,
            "interview_date": application.interview_date,
        }

        if application.status in ("INTERVIEW_SCHEDULED", "WAITING", "ONGOING"):
            interview = InterviewRepository.get_by_application(application)
            if interview:
                response_data["interview_id"] = str(interview.id)
                response_data["interview_status"] = interview.status

        return Response(response_data)


############################
####        ADMIN       ####
############################
"""
ADMIN SIDE LIST APPLICATIONS
"""
class AdminApplicationListView(APIView):
    permission_classes = [IsAuthenticated]

    SORT_FIELD_MAP = {
        "name": "user__full_name",
        "date": "submitted_at",
        "status": "status",
        "fee": "consultation_fee",
        "experience": "years_of_experience",
    }

    def get(self, request):
        applications = (
            PsychologistApplication.objects
            .select_related("user")
            .prefetch_related("specializations")
            .all()
        )

        status_filter = request.query_params.get("status")
        if status_filter:
            applications = applications.filter(status=status_filter)

        search = request.query_params.get("search", "").strip()
        if search:
            applications = applications.filter(
                models.Q(user__full_name__icontains=search) |
                models.Q(user__email__icontains=search) |
                models.Q(job_title__icontains=search)
            )

        sort_by = request.query_params.get("sort_by", "date")
        sort_dir = request.query_params.get("sort_dir", "desc")
        db_field = self.SORT_FIELD_MAP.get(sort_by, "submitted_at")
        if sort_dir == "desc":
            db_field = f"-{db_field}"
        applications = applications.order_by(db_field)

        serializer = PsychologistApplicationSerializer(applications, many=True)
        return Response(serializer.data)


"""
ADMIN SIDE APPLICATION DETAIL
"""
class AdminApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        application = get_object_or_404(
            PsychologistApplication.objects.select_related("user").prefetch_related("specializations"),
            pk=pk
        )
        serializer = PsychologistApplicationSerializer(application, context={"request": request})
        return Response(serializer.data)


"""
ADMIN UPDATE APPLICATION
"""
class AdminUpdateApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        application = get_object_or_404(PsychologistApplication, pk=pk)
        serializer = AdminUpdateApplicationSerializer(application, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(PsychologistApplicationSerializer(updated, context={"request": request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


"""
ADMIN SCHEDULE INTERVIEW
"""
class AdminScheduleInterviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        application = get_object_or_404(PsychologistApplication, pk=pk)
        serializer = AdminScheduleInterviewSerializer(data=request.data)
        if serializer.is_valid():
            interview_date = serializer.validated_data["interview_date"]
            application.interview_date = interview_date
            application.status = "INTERVIEW_SCHEDULED"
            if "admin_notes" in serializer.validated_data:
                application.admin_notes = serializer.validated_data["admin_notes"]
            application.save()

            InterviewService.create_or_update_interview(
                application=application,
                admin=request.user,
                scheduled_at=interview_date,
            )
            return Response(PsychologistApplicationSerializer(application, context={"request": request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)