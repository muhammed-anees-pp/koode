from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdminUserRole
from patients.models import PatientProfile
from psychologists.models import PsychologistProfile
from consultations.models import Consultation
from patient_summary.serializers import patient_summary_payload
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

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
        return Response(data, status=status.HTTP_200_OK)


"""
ADMIN PATIENT LIST
"""
class AdminPatientListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

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


        results = []
        for p in patients:
            pic = p.user.profile_picture
            try:
                pic_url = request.build_absolute_uri(pic.url) if pic else None
            except Exception:
                pic_url = None
            age = None
            if p.date_of_birth:
                today = timezone.localdate()
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
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }, status=status.HTTP_200_OK)


"""
ADMIN PATIENT DETAIL
"""
class AdminPatientDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def get(self, request, patient_id):
        profile = get_object_or_404(
            PatientProfile.objects.select_related("user"),
            patient_id=patient_id,
        )

        pic = profile.user.profile_picture
        try:
            pic_url = request.build_absolute_uri(pic.url) if pic else None
        except Exception:
            pic_url = None

        age = None
        if profile.date_of_birth:
            today = timezone.localdate()
            dob = profile.date_of_birth
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

        consultations = (
            Consultation.objects.select_related("booking__psychologist__user")
            .filter(booking__patient=profile)
            .order_by("booking__date", "booking__start_time", "ended_at")
        )

        consultation_history = []
        for consultation in consultations:
            booking = consultation.booking
            consultation_history.append({
                "consultation_id": str(consultation.id),
                "booking_id": str(booking.id),
                "date": booking.date,
                "start_time": booking.start_time,
                "end_time": booking.end_time,
                "booking_status": booking.status,
                "consultation_status": consultation.status,
                "psychologist_id": booking.psychologist.psychologist_id,
                "psychologist_name": booking.psychologist.user.full_name,
                "consultation_note": consultation.psychologist_note,
                "prescription": consultation.patient_note,
                "started_at": consultation.started_at,
                "ended_at": consultation.ended_at,
            })

        data = {
            "patient_id": profile.patient_id,
            "full_name": profile.user.full_name,
            "email": profile.user.email,
            "profile_picture": pic_url,
            "is_active": profile.user.is_active,
            "is_deactivated": profile.is_deactivated,
            "deactivated_at": profile.deactivated_at,
            "joined_date": profile.created_at.strftime("%b %d, %Y") if profile.created_at else None,
            "updated_date": profile.updated_at.strftime("%b %d, %Y") if profile.updated_at else None,
            "phone_number": profile.phone_number or None,
            "gender": profile.get_gender_display() if profile.gender else None,
            "date_of_birth": profile.date_of_birth,
            "age": age,
            "emergency_contact_name": profile.emergency_contact_name or None,
            "emergency_contact_number": profile.emergency_contact_number or None,
            "summary": patient_summary_payload(profile),
            "consultations": consultation_history,
            "stats": {
                "total_consultations": len(consultation_history),
                "completed_consultations": sum(1 for item in consultation_history if item["consultation_status"] == "COMPLETED"),
                "upcoming_consultations": sum(1 for item in consultation_history if item["consultation_status"] in {"SCHEDULED", "WAITING", "ONGOING"}),
                "prescriptions": sum(1 for item in consultation_history if item["prescription"]),
            },
        }

        return Response(data, status=status.HTTP_200_OK)


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

        profile.is_deactivated = not user.is_active
        profile.active = user.is_active
        profile.deactivated_at = timezone.now() if not user.is_active else None
        profile.save(update_fields=["is_deactivated", "active", "deactivated_at", "updated_at"])

        if currently_active and not user.is_active:
            outstanding_tokens = OutstandingToken.objects.filter(user=user)
            for token in outstanding_tokens:
                try:
                    BlacklistedToken.objects.get_or_create(token=token)
                except Exception:
                    pass

        action = "activated" if user.is_active else "deactivated"
        return Response({
            "patient_id": patient_id,
            "is_active": user.is_active,
            "detail": f"Patient {action} successfully.",
        }, status=status.HTTP_200_OK)




"""
ADMIN PSYCHOLOGIST LIST
"""
class AdminPsychologistListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))
        sort_by = request.query_params.get("sort_by", "joined_date")
        sort_dir = request.query_params.get("sort_dir", "desc")
        filter_status = request.query_params.get("filter_status", "all")

        queryset = PsychologistProfile.objects.select_related("user").prefetch_related("specializations")

        if filter_status == "active":
            queryset = queryset.filter(user__is_active=True)
        elif filter_status == "suspended":
            queryset = queryset.filter(user__is_active=False)

        if search:
            queryset = queryset.filter(
                Q(user__full_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(psychologist_id__icontains=search)
            )

        SORT_MAP = {
            "name": "user__full_name",
            "joined_date": "created_at",
            "status": "user__is_active",
            "experience": "years_of_experience",
            "fee": "consultation_fee",
        }

        sort_field = SORT_MAP.get(sort_by, "created_at")
        queryset = queryset.order_by(sort_field if sort_dir == "asc" else f"-{sort_field}")
        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        psychologists = queryset[start:end]
        results = []
        for p in psychologists:
            pic = p.user.profile_picture
            pic_url = None

            if pic:
                try:
                    pic_url = request.build_absolute_uri(pic.url)
                except Exception:
                    pic_url = None

            if not pic_url:
                try:
                    app = p.user.psychologist_application
                    if app and app.profile_picture:
                        pic_url = request.build_absolute_uri(app.profile_picture.url)
                except Exception:
                    pass

            specializations = [s.name for s in p.specializations.all()]

            results.append({
                "psychologist_id": p.psychologist_id,
                "full_name": p.user.full_name,
                "email": p.user.email,
                "profile_picture": pic_url,
                "is_active": p.user.is_active,
                "job_title": p.job_title,
                "years_of_experience": p.years_of_experience,
                "consultation_fee": str(p.consultation_fee),
                "specializations": specializations,
                "joined_date": p.created_at.strftime("%b %d, %Y") if p.created_at else None,
            })

        return Response({
            "results": results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }, status=status.HTTP_200_OK)


"""
ADMIN PSYCHOLOGIST DETAIL
"""
class AdminPsychologistDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def get(self, request, psychologist_id):
        profile = get_object_or_404(
            PsychologistProfile.objects.select_related("user").prefetch_related("specializations"),
            psychologist_id=psychologist_id
        )

        pic = profile.user.profile_picture
        pic_url = None
        if pic:
            try:
                pic_url = request.build_absolute_uri(pic.url)
            except Exception:
                pass
        if not pic_url:
            try:
                app = profile.user.psychologist_application
                if app and app.profile_picture:
                    pic_url = request.build_absolute_uri(app.profile_picture.url)
            except Exception:
                pass

        audio_url = None
        if profile.audio_intro:
            try:
                audio_url = request.build_absolute_uri(profile.audio_intro.url)
            except Exception:
                pass

        specializations = [s.name for s in profile.specializations.all()]

        data = {
            "psychologist_id": profile.psychologist_id,
            "full_name": profile.user.full_name,
            "email": profile.user.email,
            "phone_number": profile.phone_number,
            "profile_picture": pic_url,
            "is_active": profile.user.is_active,
            "job_title": profile.job_title,
            "years_of_experience": profile.years_of_experience,
            "consultation_fee": str(profile.consultation_fee) if profile.consultation_fee else None,
            "highest_education": profile.highest_education,
            "about": profile.about,
            "street_address": profile.street_address,
            "city": profile.city,
            "state": profile.state,
            "pincode": profile.pincode,
            "country": profile.country,
            "audio_intro": audio_url,
            "specializations": specializations,
            "joined_date": profile.created_at.strftime("%b %d, %Y") if profile.created_at else None,
        }

        return Response(data, status=status.HTTP_200_OK)


"""
ADMIN PSYCHOLOGIST SUSPEND / ACTIVATE
"""
class AdminPsychologistSuspendView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def post(self, request, psychologist_id):
        profile = get_object_or_404(PsychologistProfile, psychologist_id=psychologist_id)
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
            "psychologist_id": psychologist_id,
            "is_active": user.is_active,
            "detail": f"Psychologist {action} successfully.",
        }, status=status.HTTP_200_OK)
