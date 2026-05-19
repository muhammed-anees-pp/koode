from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from appointments.models import Booking
from consultations.models import Consultation
from patients.models import PatientProfile
from patients.permissions import IsPatient
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

        try:
            consultation = booking.consultation_session
        except Consultation.DoesNotExist:
            consultation = None
        if booking.status != "COMPLETED" or not consultation or consultation.status != "COMPLETED":
            return Response(
                {"detail": "Reviews can only be submitted after a completed consultation."},
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
