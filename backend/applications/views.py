import logging
from functools import wraps

from django.db import models, transaction
from django.http import Http404
from django.shortcuts import get_object_or_404
from interviews.repositories.interview_repository import InterviewRepository
from interviews.services.interview_service import InterviewService
from psychologists.services.psychologist_service import PsychologistProfileService
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import (PsychologistApplicationSerializer, ApplicationSubmitSerializer, AdminUpdateApplicationSerializer, AdminScheduleInterviewSerializer,)
from .services.application_service import ApplicationService
from .repositories.application_repository import ApplicationRepository
from .models import PsychologistApplication


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



############################
####    PSYCHOLOGIST    ####
############################
"""
SUBMIT APPLICATION VIEW
"""
class SubmitApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    @log_unexpected_errors("submitting psychologist application")
    def post(self, request):
        serializer = ApplicationSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        application = ApplicationService.submit_application(request.user, serializer.validated_data)
        logger.info("Application %s submitted by user %s", application.id, request.user.id)

        return Response(
            PsychologistApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED
        )


"""
GET CURRENT APPLICATION
"""
class MyApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    @log_unexpected_errors("retrieving current application")
    def get(self, request):
        application = ApplicationRepository.get_by_user(request.user)

        if not application:
            logger.info("Application not found for user %s", request.user.id)
            return Response(
                {"message": "Application not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PsychologistApplicationSerializer(application)
        logger.info("Application %s returned for user %s", application.id, request.user.id)
        return Response(serializer.data)


"""
GET APPLICATION STATUS
"""
class ApplicationStatusView(APIView):
    permission_classes = [IsAuthenticated]

    @log_unexpected_errors("retrieving application status")
    def get(self, request):
        application = ApplicationRepository.get_by_user(request.user)
        if not application:
            logger.info("Application status requested before submission by user %s", request.user.id)
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

        logger.info("Application status returned for application %s", application.id)
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

    @log_unexpected_errors("listing admin applications")
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
        logger.info("Returned %s applications for admin list", applications.count())
        return Response(serializer.data)


"""
ADMIN SIDE APPLICATION DETAIL
"""
class AdminApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @log_unexpected_errors("retrieving admin application detail")
    def get(self, request, pk):
        application = get_object_or_404(
            PsychologistApplication.objects.select_related("user").prefetch_related("specializations"),
            pk=pk
        )
        serializer = PsychologistApplicationSerializer(application, context={"request": request})
        logger.info("Admin application detail returned for application %s", pk)
        return Response(serializer.data)


"""
ADMIN UPDATE APPLICATION
"""
class AdminUpdateApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    @log_unexpected_errors("updating admin application")
    def patch(self, request, pk):
        application = get_object_or_404(PsychologistApplication, pk=pk)
        serializer = AdminUpdateApplicationSerializer(application, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            new_status = serializer.validated_data.get("status")
            updated = serializer.save()

            if new_status == "APPROVED":
                user = updated.user
                user.role = "PSYCHOLOGIST"
                user.save(update_fields=["role"])
                PsychologistProfileService.create_from_application(updated, user)

        logger.info("Application %s updated by admin user %s", updated.id, request.user.id)
        return Response(PsychologistApplicationSerializer(updated, context={"request": request}).data)


"""
ADMIN SCHEDULE INTERVIEW
"""
class AdminScheduleInterviewView(APIView):
    permission_classes = [IsAuthenticated]

    @log_unexpected_errors("scheduling application interview")
    def post(self, request, pk):
        application = get_object_or_404(PsychologistApplication, pk=pk)
        serializer = AdminScheduleInterviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
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

        logger.info("Interview scheduled for application %s by admin user %s", application.id, request.user.id)
        return Response(PsychologistApplicationSerializer(application, context={"request": request}).data)
