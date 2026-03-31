from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from .permissions import IsPsychologist
from .models import PsychologistProfile
from .serializers import PsychologistProfileSerializer


"""
LIST ACTIVE SPECIALIZATIONS
"""
class SpecializationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import Specialization
        specializations = Specialization.objects.filter(active=True).order_by("name")
        data = [{"id": s.id, "name": s.name} for s in specializations]
        return Response(data)


"""
PSYCHOLOGIST PROFILE VIEW
"""
class PsychologistProfileView(APIView):
    permission_classes = [IsPsychologist]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        profile = get_object_or_404(PsychologistProfile, user=request.user)
        serializer = PsychologistProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        profile = get_object_or_404(PsychologistProfile, user=request.user)
        raw = request.data
        if hasattr(raw, "dict"):
            raw = raw.dict()

        spec_ids_raw = request.data.getlist("specialization_ids") if hasattr(request.data, "getlist") else raw.get("specialization_ids", None)
        processed_data = {}
        for key, value in raw.items():
            if key == "specialization_ids":
                continue 
            if key in ("full_name", "profile_picture"):
                if "user" not in processed_data:
                    processed_data["user"] = {}
                if key == "profile_picture" and value == "":
                    processed_data["user"][key] = None
                else:
                    processed_data["user"][key] = value
            else:
                processed_data[key] = value

        if "audio_intro" in request.FILES:
            processed_data["audio_intro"] = request.FILES["audio_intro"]
        elif raw.get("audio_intro") == "":
            processed_data["audio_intro"] = None

        if spec_ids_raw is not None:
            try:
                processed_data["specialization_ids"] = [int(i) for i in spec_ids_raw if str(i).strip()]
            except (ValueError, TypeError):
                processed_data["specialization_ids"] = []

        serializer = PsychologistProfileSerializer(profile, data=processed_data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)