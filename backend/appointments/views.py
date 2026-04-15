from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from .models import Availability
from psychologists.models import PsychologistProfile
from psychologists.permissions import IsPsychologist
from .serializers import (
    AvailabilitySerializer, CreateAvailabilitySerializer,
)


"""
CREATE AVAILABILITY
"""
class CreateAvailabilityView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    def post(self, request):
        psychologist = get_object_or_404(PsychologistProfile, user=request.user)
        serializer = CreateAvailabilitySerializer(data=request.data, context={"psychologist": psychologist})

        if serializer.is_valid():
            availability = serializer.save()
            return Response(
                AvailabilitySerializer(availability).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


"""
LIST OWN AVAILABILITY
"""
class PsychologistAvailabilityListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPsychologist]

    def get(self, request):
        psychologist = get_object_or_404(PsychologistProfile, user=request.user)
        qs = Availability.objects.filter(psychologist=psychologist).prefetch_related("slots").order_by("date")
        serializer = AvailabilitySerializer(qs, many=True)
        return Response(serializer.data)


"""
VIEW PSYCHOLOGIST SLOTS
"""
class PsychologistSlotListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, psychologist_id):
        psychologist = get_object_or_404(PsychologistProfile, psychologist_id=psychologist_id)
        date = request.query_params.get("date")
        qs = Availability.objects.filter(psychologist=psychologist)
        if date:
            qs = qs.filter(date=date)

        qs = qs.prefetch_related("slots").order_by("date")
        serializer = AvailabilitySerializer(qs, many=True)
        return Response(serializer.data)


