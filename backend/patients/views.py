import logging
from functools import wraps
from django.core.exceptions import ObjectDoesNotExist
from django.db import DatabaseError
from django.db.models import Q
from django.db.models import Avg
from django.http import Http404
from django.shortcuts import get_object_or_404
from appointments.models import AvailableSlot
from psychologists.models import PsychologistProfile
from reviews.models import ConsultationReview
from notifications.time_formatting import INDIA_TZ, format_india_date, format_india_time
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
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


def next_available_slot_payload(psychologist):
    now = timezone.now().astimezone(INDIA_TZ)
    slot = (
        AvailableSlot.objects.select_related("availability")
        .filter(
            availability__psychologist=psychologist,
            is_booked=False,
        )
        .filter(
            Q(availability__date__gt=now.date())
            | Q(availability__date=now.date(), start_time__gt=now.time())
        )
        .order_by("availability__date", "start_time", "end_time")
        .first()
    )

    if not slot:
        return None

    slot_date = slot.availability.date
    if slot_date == now.date():
        date_label = "Today"
    elif slot_date == (now.date() + timezone.timedelta(days=1)):
        date_label = "Tomorrow"
    else:
        date_label = format_india_date(slot_date)

    return {
        "id": str(slot.id),
        "date": slot_date,
        "start_time": slot.start_time,
        "end_time": slot.end_time,
        "label": f"{date_label}, {format_india_time(slot.start_time)}",
    }


def psychologist_review_summary(psychologist):
    empty_summary = {
        "average_rating": None,
        "rated_patient_count": 0,
        "review_count": 0,
        "reviews": [],
    }

    reviews = ConsultationReview.objects.filter(psychologist=psychologist)
    try:
        patient_averages = list(
            reviews.values("patient_id").annotate(average_rating=Avg("rating"))
        )
    except DatabaseError:
        logger.exception("Unable to load review summary for psychologist %s", psychologist.psychologist_id)
        return empty_summary

    average_rating = None
    if patient_averages:
        average_rating = round(
            sum(float(item["average_rating"]) for item in patient_averages) / len(patient_averages),
            3,
        )

    latest_by_patient = {}
    latest_reviews = (
        reviews.select_related("patient__user", "booking")
        .order_by("-updated_at", "-submitted_at")
    )
    for review in latest_reviews:
        if review.patient_id in latest_by_patient:
            continue
        latest_by_patient[review.patient_id] = review

    visible_reviews = []
    for review in latest_by_patient.values():
        if not review.review.strip():
            continue
        visible_reviews.append({
            "id": str(review.id),
            "patient_id": review.patient_id,
            "patient_name": review.patient.user.full_name,
            "rating": review.rating,
            "review": review.review,
            "submitted_at": review.submitted_at,
            "updated_at": review.updated_at,
            "appointment_date": review.booking.date,
        })

    return {
        "average_rating": average_rating,
        "rated_patient_count": len(patient_averages),
        "review_count": reviews.count(),
        "reviews": visible_reviews,
    }

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
PATIENT PSYCHOLOGIST LIST VIEW
"""
class PatientPsychologistListView(APIView):
    permission_classes = [AllowAny]

    @log_unexpected_errors("listing psychologists for patients")
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
                "total_experience_hours": p.total_experience_hours,
                "consultation_fee": str(p.consultation_fee) if p.consultation_fee else None,
                "specializations": specializations,
                "next_available_slot": next_available_slot_payload(p),
                "audio_intro": audio_url,
                "ratings": psychologist_review_summary(p),
            })

        logger.info("Returned %s active psychologists for patient listing", len(results))
        return Response({"results": results}, status=status.HTTP_200_OK)


"""
PATIENT PSYCHOLOGIST DETAIL VIEW
"""
class PatientPsychologistDetailView(APIView):
    permission_classes = [AllowAny]

    @log_unexpected_errors("retrieving psychologist detail for patients")
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
        specialization_details = [
            {"name": s.name, "description": s.description}
            for s in profile.specializations.all()
        ]

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
            "specialization_details": specialization_details,
            "audio_intro": audio_url,
            "ratings": psychologist_review_summary(profile),
        }

        logger.info("Returned psychologist detail for psychologist %s", psychologist_id)
        return Response(data, status=status.HTTP_200_OK)
