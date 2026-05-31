import logging
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from patients.views import build_absolute_file_url, next_available_slot_payload, psychologist_review_summary
from psychologists.models import PsychologistProfile
from .recommender import QUESTION_TREE, recommend_department

logger = logging.getLogger(__name__)


"""
RECOMMENDATION OF DEPARTMENT
"""
class RecommendationSerializer(serializers.Serializer):
    answers = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    concern_text = serializers.CharField(required=False, allow_blank=True, max_length=2000)


def psychologist_payload(request, profile):
    pic_url = build_absolute_file_url(
        request,
        profile.user.profile_picture,
        f"psychologist {profile.psychologist_id} profile picture",
    )
    if not pic_url:
        try:
            application = profile.user.psychologist_application
            if application and application.profile_picture:
                pic_url = build_absolute_file_url(
                    request,
                    application.profile_picture,
                    f"application profile picture for psychologist {profile.psychologist_id}",
                )
        except ObjectDoesNotExist:
            pass

    audio_url = build_absolute_file_url(
        request,
        profile.audio_intro,
        f"psychologist {profile.psychologist_id} audio intro",
    )

    return {
        "psychologist_id": profile.psychologist_id,
        "full_name": profile.user.full_name,
        "profile_picture": pic_url,
        "job_title": profile.job_title,
        "years_of_experience": profile.years_of_experience,
        "total_experience_hours": profile.total_experience_hours,
        "consultation_fee": str(profile.consultation_fee) if profile.consultation_fee else None,
        "specializations": [specialization.name for specialization in profile.specializations.all()],
        "next_available_slot": next_available_slot_payload(profile),
        "audio_intro": audio_url,
        "ratings": psychologist_review_summary(profile),
    }


"""
FIND PSYCHOLOGIST QUESTIONS VIEW
"""
class PsychologistFinderQuestionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"question_tree": QUESTION_TREE}, status=status.HTTP_200_OK)



"""
PSYCHOLOGIST FINDER RECOMMENDATION VIEW
"""
class PsychologistFinderRecommendationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RecommendationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        recommendation = recommend_department(
            serializer.validated_data["answers"],
            serializer.validated_data.get("concern_text", ""),
        )
        department = recommendation["department"]

        queryset = (
            PsychologistProfile.objects.filter(
                user__is_active=True,
                active=True,
                specializations__name__iexact=department,
            )
            .select_related("user")
            .prefetch_related("specializations")
            .distinct()
            .order_by("-verified", "-total_session_minutes", "-created_at")
        )

        psychologists = [psychologist_payload(request, profile) for profile in queryset]
        logger.info("Psychologist finder recommended %s with %s psychologists", department, len(psychologists))

        return Response(
            {
                "recommendation": recommendation,
                "psychologists": psychologists,
            },
            status=status.HTTP_200_OK,
        )
