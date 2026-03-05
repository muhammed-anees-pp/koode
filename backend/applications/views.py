from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .serializers import (PsychologistApplicationSerializer, ApplicationSubmitSerializer)
from .services.application_service import ApplicationService
from .repositories.application_repository import ApplicationRepository


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

        return Response(
            {
                "status": application.status,
                "interview_date": application.interview_date
            }
        )