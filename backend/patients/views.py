import logging
from functools import wraps
from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404
from django.shortcuts import get_object_or_404
from psychologists.models import PsychologistProfile
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import PatientProfile
from .serializers import PatientProfileSerializer


NULLABLE_FIELDS = {'date_of_birth', 'gender'}
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


def build_absolute_file_url(request, file_field, context):
    if not file_field:
        return None

    try:
        return request.build_absolute_uri(file_field.url)
    except Exception:
        logger.exception("Failed to build file URL for %s", context)
        return None

"""
PATIENT PROFILE VIEW
"""
class PatientProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    @log_unexpected_errors("retrieving patient profile")
    def get(self, request):
        if request.user.role != "PATIENT":
            logger.warning("Patient profile denied for user %s with role %s", request.user.id, request.user.role)
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        profile = get_object_or_404(PatientProfile, user=request.user)
        serializer = PatientProfileSerializer(profile)
        logger.info("Patient profile returned for user %s", request.user.id)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @log_unexpected_errors("updating patient profile")
    def put(self, request):
        if request.user.role != "PATIENT":
            logger.warning("Patient profile update denied for user %s with role %s", request.user.id, request.user.role)
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        profile = get_object_or_404(PatientProfile, user=request.user)
        raw = request.data
        if hasattr(raw, 'dict'):
            raw = raw.dict()

        processed_data = {}
        for key, value in raw.items():
            if key in ('full_name', 'profile_picture'):
                if 'user' not in processed_data:
                    processed_data['user'] = {}

                if key == 'profile_picture' and value == '':
                    processed_data['user'][key] = None
                else:
                    processed_data['user'][key] = value
            elif key in NULLABLE_FIELDS and value == '':
                processed_data[key] = None
            else:
                processed_data[key] = value

        serializer = PatientProfileSerializer(profile, data=processed_data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info("Patient profile updated for user %s", request.user.id)
        return Response(serializer.data, status=status.HTTP_200_OK)


"""
PATIENT THERAPIST LIST VIEW
"""
class PatientTherapistListView(APIView):
    permission_classes = [AllowAny]

    @log_unexpected_errors("listing therapists for patients")
    def get(self, request):
        queryset = PsychologistProfile.objects.filter(user__is_active=True).select_related("user").prefetch_related("specializations").order_by("-created_at")
        
        results = []
        for p in queryset:
            pic = p.user.profile_picture
            pic_url = build_absolute_file_url(request, pic, f"psychologist {p.psychologist_id} profile picture")
            if not pic_url:
                try:
                    app = p.user.psychologist_application
                    if app and app.profile_picture:
                        pic_url = build_absolute_file_url(request, app.profile_picture, f"application profile picture for psychologist {p.psychologist_id}")
                except ObjectDoesNotExist:
                    logger.debug("No application profile picture fallback for psychologist %s", p.psychologist_id)
                except Exception:
                    logger.exception("Failed to read application profile picture for psychologist %s", p.psychologist_id)

            audio_url = build_absolute_file_url(request, p.audio_intro, f"psychologist {p.psychologist_id} audio intro")

            specializations = [s.name for s in p.specializations.all()]

            results.append({
                "psychologist_id": p.psychologist_id,
                "full_name": p.user.full_name,
                "profile_picture": pic_url,
                "job_title": p.job_title,
                "years_of_experience": p.years_of_experience,
                "consultation_fee": str(p.consultation_fee) if p.consultation_fee else None,
                "specializations": specializations,
                "audio_intro": audio_url,
            })

        logger.info("Returned %s active therapists for patient listing", len(results))
        return Response({"results": results}, status=status.HTTP_200_OK)


"""
PATIENT THERAPIST DETAIL VIEW
"""
class PatientTherapistDetailView(APIView):
    permission_classes = [AllowAny]

    @log_unexpected_errors("retrieving therapist detail for patients")
    def get(self, request, psychologist_id):
        profile = get_object_or_404(
            PsychologistProfile.objects.select_related("user").prefetch_related("specializations"),
            psychologist_id=psychologist_id,
            user__is_active=True
        )

        pic = profile.user.profile_picture
        pic_url = build_absolute_file_url(request, pic, f"psychologist {profile.psychologist_id} profile picture")
        if not pic_url:
            try:
                app = profile.user.psychologist_application
                if app and app.profile_picture:
                    pic_url = build_absolute_file_url(request, app.profile_picture, f"application profile picture for psychologist {profile.psychologist_id}")
            except ObjectDoesNotExist:
                logger.debug("No application profile picture fallback for psychologist %s", profile.psychologist_id)
            except Exception:
                logger.exception("Failed to read application profile picture for psychologist %s", profile.psychologist_id)

        audio_url = build_absolute_file_url(request, profile.audio_intro, f"psychologist {profile.psychologist_id} audio intro")

        specializations = [s.name for s in profile.specializations.all()]

        data = {
            "psychologist_id": profile.psychologist_id,
            "full_name": profile.user.full_name,
            "profile_picture": pic_url,
            "job_title": profile.job_title,
            "years_of_experience": profile.years_of_experience,
            "consultation_fee": str(profile.consultation_fee) if profile.consultation_fee else None,
            "highest_education": profile.highest_education,
            "about": profile.about,
            "specializations": specializations,
            "audio_intro": audio_url,
        }

        logger.info("Returned therapist detail for psychologist %s", psychologist_id)
        return Response(data, status=status.HTTP_200_OK)
