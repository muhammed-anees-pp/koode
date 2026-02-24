from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import PatientProfile
from .serializers import PatientProfileSerializer
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser


NULLABLE_FIELDS = {'date_of_birth', 'gender'}

"""
PATIENT PROFILE VIEW
"""
class PatientProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    # DISPLAY
    def get(self, request):
        if request.user.role != "PATIENT":
            return Response({"detail": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        profile = get_object_or_404(PatientProfile, user=request.user)
        serializer = PatientProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # EDITING
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
