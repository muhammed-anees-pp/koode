from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from patients . permissions import IsPatient



"""
HOME PAGE
"""
class HomeView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request):
        data = {
            "message": "Welcome to Home",
            "patient_email": request.user.email,
            "role": request.user.role,
        }
        return Response(data, status = status.HTTP_200_OK)
