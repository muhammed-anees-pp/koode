from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Avg, Count, Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from appointments.models import Booking
from admin_panel.permissions import IsAdminUserRole
from patients.models import PatientProfile
from patients.permissions import IsPatient
from patient_summary.serializers import patient_summary_payload
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


def admin_review_payload(review):
    booking = review.booking
    patient = review.patient
    psychologist = review.psychologist
    consultation = getattr(booking, "consultation_session", None)
    specializations = [item.name for item in psychologist.specializations.all()]
    psychologist_average = getattr(review, "psychologist_average_rating", None)

    return {
        "id": str(review.id),
        "rating": review.rating,
        "review": review.review,
        "submitted_at": review.submitted_at,
        "updated_at": review.updated_at,
        "slot": {
            "date": booking.date,
            "start_time": booking.start_time,
            "end_time": booking.end_time,
        },
        "patient": {
            "patient_id": patient.patient_id,
            "full_name": patient.user.full_name,
            "email": patient.user.email,
            "phone_number": patient.phone_number or None,
        },
        "psychologist": {
            "psychologist_id": psychologist.psychologist_id,
            "full_name": psychologist.user.full_name,
            "email": psychologist.user.email,
            "phone_number": psychologist.phone_number or None,
            "specialization": ", ".join(specializations) if specializations else psychologist.job_title,
            "average_rating": round(psychologist_average, 1) if psychologist_average else None,
            "review_count": getattr(review, "psychologist_review_count", 0),
        },
        "consultation": {
            "notes": consultation.psychologist_note if consultation else "",
            "prescription": consultation.patient_note if consultation else "",
            "patient_summary": patient_summary_payload(patient),
        },
    }


"""
ADMIN REVIEWS
"""
class AdminReviewListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        rating = request.query_params.get("rating", "").strip()
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))

        queryset = ConsultationReview.objects.select_related(
            "booking__consultation_session",
            "patient__user",
            "patient__summary_report",
            "psychologist__user",
        ).prefetch_related("psychologist__specializations").annotate(
            psychologist_average_rating=Avg("psychologist__consultation_reviews__rating"),
            psychologist_review_count=Count("psychologist__consultation_reviews"),
        ).order_by("-submitted_at")

        if search:
            queryset = queryset.filter(
                Q(patient__user__full_name__icontains=search) |
                Q(patient__user__email__icontains=search) |
                Q(patient__patient_id__icontains=search) |
                Q(psychologist__user__full_name__icontains=search) |
                Q(psychologist__user__email__icontains=search) |
                Q(psychologist__psychologist_id__icontains=search)
            )

        if rating in {"1", "2", "3", "4", "5"}:
            queryset = queryset.filter(rating=int(rating))

        today = timezone.localdate()
        summary = ConsultationReview.objects.aggregate(
            average_rating=Avg("rating"),
            total_reviews=Count("id"),
            reviews_today=Count("id", filter=Q(submitted_at__date=today)),
            low_ratings=Count("id", filter=Q(rating__lte=2)),
        )

        total = queryset.count()
        start = (page - 1) * page_size
        end = start + page_size
        reviews = queryset[start:end]

        return Response({
            "summary": {
                "average_rating": round(summary["average_rating"], 1) if summary["average_rating"] else None,
                "total_reviews": summary["total_reviews"] or 0,
                "reviews_today": summary["reviews_today"] or 0,
                "low_ratings": summary["low_ratings"] or 0,
            },
            "results": [admin_review_payload(review) for review in reviews],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }, status=status.HTTP_200_OK)
