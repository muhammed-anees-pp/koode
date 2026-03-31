from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import PatientProfile
from .serializers import PatientProfileSerializer
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from psychologists.models import PsychologistProfile


NULLABLE_FIELDS = {'date_of_birth', 'gender'}

"""
PATIENT PROFILE VIEW
"""
class PatientProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get(self, request):
        if request.user.role != "PATIENT":
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        profile = get_object_or_404(PatientProfile, user=request.user)
        serializer = PatientProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        if request.user.role != "PATIENT":
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
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


"""
PATIENT THERAPIST LIST VIEW
"""
class PatientTherapistListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = PsychologistProfile.objects.filter(user__is_active=True).select_related("user").prefetch_related("specializations").order_by("-created_at")
        
        results = []
        for p in queryset:
            pic = p.user.profile_picture
            pic_url = None
            if pic:
                try: pic_url = request.build_absolute_uri(pic.url)
                except Exception: pass
            if not pic_url:
                try:
                    app = p.user.psychologist_application
                    if app and app.profile_picture:
                        pic_url = request.build_absolute_uri(app.profile_picture.url)
                except Exception: pass

            audio_url = None
            if p.audio_intro:
                try: audio_url = request.build_absolute_uri(p.audio_intro.url)
                except Exception: pass

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

        return Response({"results": results}, status=status.HTTP_200_OK)


"""
PATIENT THERAPIST DETAIL VIEW
"""
class PatientTherapistDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, psychologist_id):
        profile = get_object_or_404(
            PsychologistProfile.objects.select_related("user").prefetch_related("specializations"),
            psychologist_id=psychologist_id,
            user__is_active=True
        )

        pic = profile.user.profile_picture
        pic_url = None
        if pic:
            try: pic_url = request.build_absolute_uri(pic.url)
            except Exception: pass
        if not pic_url:
            try:
                app = profile.user.psychologist_application
                if app and app.profile_picture:
                    pic_url = request.build_absolute_uri(app.profile_picture.url)
            except Exception: pass

        audio_url = None
        if profile.audio_intro:
            try: audio_url = request.build_absolute_uri(profile.audio_intro.url)
            except Exception: pass

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

        return Response(data, status=status.HTTP_200_OK)

