from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Avg, Count, Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from appointments.models import Booking
from patients.models import PatientProfile
from patients.permissions import IsPatient
from psychologists.models import PsychologistProfile
from psychologists.permissions import IsPsychologist
from reviews.models import ConsultationReview
from reviews.serializers import ConsultationReviewSerializer


"""
REVIEW AFTER CONSULTATION
"""
class BookingReviewView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def post(self, request, booking_id):
        patient = get_object_or_404(PatientProfile, user=request.user)
        booking = get_object_or_404(
            Booking.objects.select_related("patient", "psychologist", "consultation_session"),
            id=booking_id,
            patient=patient,
        )

        if booking.status != "COMPLETED":
            return Response(
                {"detail": "Reviews can only be submitted after a completed appointment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ConsultationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            existing = booking.review
        except ConsultationReview.DoesNotExist:
            existing = None
        if existing:
            if not existing.can_edit:
                return Response(
                    {"detail": "This review can no longer be edited."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            existing.rating = serializer.validated_data["rating"]
            existing.review = serializer.validated_data.get("review", "")
            existing.updated_at = timezone.now()
            existing.save(update_fields=["rating", "review", "updated_at"])
            return Response(ConsultationReviewSerializer(existing).data, status=status.HTTP_200_OK)

        review = ConsultationReview.objects.create(
            booking=booking,
            patient=patient,
            psychologist=booking.psychologist,
            rating=serializer.validated_data["rating"],
            review=serializer.validated_data.get("review", ""),
        )
        return Response(ConsultationReviewSerializer(review).data, status=status.HTTP_201_CREATED)


"""
PSYCHOLOGIST REVIEW DASHBOARD
"""
class PsychologistReviewDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsPsychologist]

    def get(self, request):
        psychologist = get_object_or_404(PsychologistProfile, user=request.user)
        reviews = ConsultationReview.objects.filter(psychologist=psychologist).order_by("-submitted_at")

        now = timezone.localtime()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        summary = reviews.aggregate(
            overall_rating=Avg("rating"),
            total_reviews=Count("id"),
            this_month_rating=Avg("rating", filter=Q(submitted_at__gte=month_start)),
            low_ratings=Count("id", filter=Q(rating__lte=2)),
        )

        rating_counts = {
            item["rating"]: item["count"]
            for item in reviews.order_by().values("rating").annotate(count=Count("id"))
        }

        payload = {
            "summary": {
                "overall_rating": round(summary["overall_rating"], 1) if summary["overall_rating"] else None,
                "total_reviews": summary["total_reviews"] or 0,
                "this_month_rating": round(summary["this_month_rating"], 1) if summary["this_month_rating"] else None,
                "low_ratings": summary["low_ratings"] or 0,
            },
            "rating_breakdown": [
                {"rating": rating, "count": rating_counts.get(rating, 0)}
                for rating in range(5, 0, -1)
            ],
            "reviews": [
                {
                    "id": str(review.id),
                    "rating": review.rating,
                    "review": review.review,
                    "submitted_at": review.submitted_at,
                }
                for review in reviews
            ],
        }

        return Response(payload, status=status.HTTP_200_OK)
