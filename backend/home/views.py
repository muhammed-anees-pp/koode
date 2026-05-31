from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from appointments.models import Booking
from appointments.serializers import BookingSerializer
from finance.services.wallets import get_wallet
from notifications.time_formatting import INDIA_TZ
from patients.models import PatientProfile
from patients.permissions import IsPatient
from patients.views import build_absolute_file_url, next_available_slot_payload
from psychologists.models import PsychologistProfile



"""
HOME PAGE
"""
class HomeView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request):
        patient = get_object_or_404(PatientProfile, user=request.user)
        now = timezone.now().astimezone(INDIA_TZ)
        today = now.date()

        active_bookings = (
            Booking.objects.select_related(
                "slot",
                "psychologist__user",
                "patient__user",
                "patient__summary_report",
                "consultation_session",
                "review",
                "complaint",
            )
            .prefetch_related("psychologist__specializations")
            .filter(patient=patient)
            .exclude(status="CANCELLED")
        )

        today_booking = (
            active_bookings.filter(
                date=today,
                status="CONFIRMED",
                payment_status="PAID",
            )
            .order_by("start_time", "end_time", "created_at")
            .first()
        )
        next_booking = (
            active_bookings.filter(
                Q(date__gt=today) | Q(date=today, end_time__gte=now.time()),
                status__in=["PENDING", "CONFIRMED"],
            )
            .order_by("date", "start_time", "end_time", "created_at")
            .first()
        )
        recent_history = (
            active_bookings.filter(Q(status="COMPLETED") | Q(date__lt=today))
            .order_by("-date", "-start_time", "-created_at")[:4]
        )

        booking_context = {"request": request}
        wallet = get_wallet(request.user)
        data = {
            "message": "Welcome to Home",
            "patient_email": request.user.email,
            "patient_name": request.user.full_name,
            "role": request.user.role,
            "today": today,
            "today_consultation": BookingSerializer(today_booking, context=booking_context).data if today_booking else None,
            "next_appointment": BookingSerializer(next_booking, context=booking_context).data if next_booking else None,
            "recent_history": BookingSerializer(recent_history, many=True, context=booking_context).data,
            "wallet": {
                "balance": str(wallet.balance),
            },
            "top_psychologists": self.get_top_psychologists(request),
        }
        return Response(data, status = status.HTTP_200_OK)

    def get_top_psychologists(self, request):
        psychologists = (
            PsychologistProfile.objects.filter(user__is_active=True, active=True, verified=True)
            .select_related("user")
            .prefetch_related("specializations")
            .annotate(average_rating=Avg("consultation_reviews__rating"), review_count=Count("consultation_reviews"))
            .order_by("-average_rating", "-total_session_minutes", "-created_at")[:4]
        )

        results = []
        for psychologist in psychologists:
            photo = psychologist.user.profile_picture
            photo_url = build_absolute_file_url(request, photo, f"psychologist {psychologist.psychologist_id} profile picture")
            audio_url = build_absolute_file_url(request, psychologist.audio_intro, f"psychologist {psychologist.psychologist_id} audio intro")
            specializations = list(psychologist.specializations.all())
            results.append({
                "id": psychologist.psychologist_id,
                "name": psychologist.user.full_name,
                "photo": photo_url,
                "audio_intro": audio_url,
                "title": psychologist.job_title,
                "specialization": specializations[0].name if specializations else psychologist.job_title,
                "tags": [item.name for item in specializations[:3]],
                "consultation_fee": str(psychologist.consultation_fee),
                "experience_hours": psychologist.total_experience_hours,
                "average_rating": round(float(psychologist.average_rating), 1) if psychologist.average_rating else None,
                "review_count": psychologist.review_count,
                "next_available_slot": next_available_slot_payload(psychologist),
            })

        return results
