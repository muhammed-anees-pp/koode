from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdminUserRole



"""
ADMIN DASHBOARD
"""
class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def get(self, request):
        data = {
            "message": "Welcome to Dashboard",
            "admin_email": request.user.email,
            "role": request.user.role,
        }
        return Response(data, status = status.HTTP_200_OK)
