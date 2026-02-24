from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdminUserRole
from patients.models import PatientProfile
from django.db.models import Q


"""
ADMIN DASHBOARD
"""
class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    # DISPLAY
    def get(self, request):
        data = {
            "message": "Welcome to Dashboard",
            "admin_email": request.user.email,
            "role": request.user.role,
        }
        return Response(data, status=status.HTTP_200_OK)


"""
ADMIN PATIENT LIST
"""
class AdminPatientListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    # DISPLAY
    def get(self, request):
        search = request.query_params.get("search", "").strip()
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))

        queryset = PatientProfile.objects.select_related("user").all().order_by("-created_at")

        if search:
            queryset = queryset.filter(
                Q(user__full_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(patient_id__icontains=search)
            )

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        patients = queryset[start:end]

        BASE_URL = request.build_absolute_uri("/").rstrip("/")

        results = []
        for p in patients:
            pic = p.user.profile_picture
            pic_url = f"{BASE_URL}{pic.url}" if pic else None
            results.append({
                "patient_id": p.patient_id,
                "full_name": p.user.full_name,
                "email": p.user.email,
                "profile_picture": pic_url,
                "is_active": not p.is_deactivated,
                "joined_date": p.created_at.strftime("%b %d, %Y") if p.created_at else None,
            })

        return Response({
            "results": results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, -(-total // page_size)),
        }, status=status.HTTP_200_OK)
