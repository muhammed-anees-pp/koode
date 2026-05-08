import logging
from functools import wraps
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .permissions import IsPsychologist
from appointments.models import Booking
from consultations.models import Consultation
from .models import PsychologistProfile, Specialization
from .serializers import PsychologistProfileSerializer
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


"""
LIST ACTIVE SPECIALIZATIONS
"""
class SpecializationListView(APIView):
    permission_classes = [IsAuthenticated]

    @log_unexpected_errors("listing active specializations")
    def get(self, request):
        specializations = Specialization.objects.filter(active=True).order_by("name")
        data = [{"id": s.id, "name": s.name} for s in specializations]
        logger.info("Returned %s active specializations", len(data))
        return Response(data)


"""
PSYCHOLOGIST PROFILE VIEW
"""
class PsychologistProfileView(APIView):
    permission_classes = [IsPsychologist]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @log_unexpected_errors("retrieving psychologist profile")
    def get(self, request):
        profile = get_object_or_404(PsychologistProfile, user=request.user)
        serializer = PsychologistProfileSerializer(profile)
        logger.info("Psychologist profile returned for user %s", request.user.id)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @log_unexpected_errors("updating psychologist profile")
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
                logger.warning("Invalid specialization_ids submitted by user %s: %s", request.user.id, spec_ids_raw)
                processed_data["specialization_ids"] = []

        serializer = PsychologistProfileSerializer(profile, data=processed_data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info("Psychologist profile updated for user %s", request.user.id)
        return Response(serializer.data, status=status.HTTP_200_OK)


"""
PATIENTS LIST VIEW FOR PSYCHOLOGIST
"""
class PsychologistPatientListView(APIView):
    permission_classes = [IsAuthenticated, IsPsychologist]

    @log_unexpected_errors("listing psychologist patients")
    def get(self, request):
        psychologist = get_object_or_404(PsychologistProfile, user=request.user)
        bookings = (
            Booking.objects.select_related("patient__user")
            .filter(psychologist=psychologist)
            .exclude(status="CANCELLED")
            .order_by("-date", "-start_time", "-created_at")
        )

        patient_map = {}
        patient_ids = []
        for booking in bookings:
            patient = booking.patient
            if patient.patient_id not in patient_map:
                patient_ids.append(patient.patient_id)
                patient_map[patient.patient_id] = {
                    "patient_id": patient.patient_id,
                    "name": patient.user.full_name,
                    "email": patient.user.email,
                    "phone_number": patient.phone_number,
                    "gender": patient.gender,
                    "date_of_birth": patient.date_of_birth,
                    "appointment_count": 0,
                    "completed_count": 0,
                    "upcoming_count": 0,
                    "last_appointment": None,
                    "next_appointment": None,
                    "notes": [],
                }

            entry = patient_map[patient.patient_id]
            entry["appointment_count"] += 1
            if booking.status == "COMPLETED":
                entry["completed_count"] += 1
            elif booking.status in {"PENDING", "CONFIRMED"}:
                entry["upcoming_count"] += 1

            appointment = {
                "booking_id": booking.id,
                "date": booking.date,
                "start_time": booking.start_time,
                "end_time": booking.end_time,
                "status": booking.status,
            }
            if entry["last_appointment"] is None:
                entry["last_appointment"] = appointment
            if booking.status in {"PENDING", "CONFIRMED"}:
                entry["next_appointment"] = appointment

        notes = (
            Consultation.objects.select_related(
                "booking__patient",
                "booking__psychologist__user",
            )
            .filter(
                booking__patient_id__in=patient_ids,
                status="COMPLETED",
            )
            .order_by("-booking__date", "-booking__start_time", "-ended_at")
        )

        for consultation in notes:
            entry = patient_map.get(consultation.booking.patient_id)
            if not entry:
                continue
            entry["notes"].append({
                "consultation_id": consultation.id,
                "booking_id": consultation.booking_id,
                "date": consultation.booking.date,
                "start_time": consultation.booking.start_time,
                "end_time": consultation.booking.end_time,
                "psychologist_name": consultation.booking.psychologist.user.full_name,
                "patient_note": consultation.patient_note,
                "psychologist_note": consultation.psychologist_note,
            })

        return Response([patient_map[patient_id] for patient_id in patient_ids], status=status.HTTP_200_OK)
