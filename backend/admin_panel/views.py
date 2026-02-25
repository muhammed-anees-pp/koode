from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdminUserRole
from patients.models import PatientProfile
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

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
        sort_by = request.query_params.get("sort_by", "joined_date")
        sort_dir = request.query_params.get("sort_dir", "desc") 
        filter_status = request.query_params.get("filter_status", "all")
        queryset = PatientProfile.objects.select_related("user").all()

        if filter_status == "active":
            queryset = queryset.filter(user__is_active=True)
        elif filter_status == "suspended":
            queryset = queryset.filter(user__is_active=False)

        if search:
            queryset = queryset.filter(
                Q(user__full_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(patient_id__icontains=search)
            )

        SORT_MAP = {
            "name": "user__full_name",
            "joined_date": "created_at",
            "status": "user__is_active",
        }
        sort_field = SORT_MAP.get(sort_by, "created_at")
        if sort_dir == "asc":
            queryset = queryset.order_by(sort_field)
        else:
            queryset = queryset.order_by(f"-{sort_field}")

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        patients = queryset[start:end]

        BASE_URL = request.build_absolute_uri("/").rstrip("/")

        from datetime import date as date_type
        results = []
        for p in patients:
            pic = p.user.profile_picture
            pic_url = f"{BASE_URL}{pic.url}" if pic else None
            age = None
            if p.date_of_birth:
                today = date_type.today()
                dob = p.date_of_birth
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            results.append({
                "patient_id": p.patient_id,
                "full_name": p.user.full_name,
                "email": p.user.email,
                "profile_picture": pic_url,
                "is_active": p.user.is_active,
                "joined_date": p.created_at.strftime("%b %d, %Y") if p.created_at else None,
                "phone_number": p.phone_number or None,
                "gender": p.get_gender_display() if p.gender else None,
                "age": age,
            })

        return Response({
            "results": results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, -(-total // page_size)),
        }, status=status.HTTP_200_OK)


"""
ADMIN PATIENT SUSPEND / ACTIVATE
"""
class AdminPatientSuspendView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def post(self, request, patient_id):
        profile = get_object_or_404(PatientProfile, patient_id=patient_id)
        user = profile.user
        currently_active = user.is_active
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])

        if currently_active and not user.is_active:
            outstanding_tokens = OutstandingToken.objects.filter(user=user)
            for token in outstanding_tokens:
                try:
                    BlacklistedToken.objects.get_or_create(token=token)
                except Exception:
                    pass

        action = "activated" if user.is_active else "suspended"
        return Response({
            "patient_id": patient_id,
            "is_active": user.is_active,
            "detail": f"Patient {action} successfully.",
        }, status=status.HTTP_200_OK)
