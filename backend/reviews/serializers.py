from rest_framework import serializers
from reviews.models import ConsultationReview



def review_payload(review):
    if not review:
        return None

    return {
        "id": str(review.id),
        "rating": review.rating,
        "review": review.review,
        "submitted_at": review.submitted_at,
        "updated_at": review.updated_at,
        "edit_deadline": review.edit_deadline,
        "can_edit": review.can_edit,
    }


"""
REVIEW SERIALIZER
"""
class ConsultationReviewSerializer(serializers.ModelSerializer):
    can_edit = serializers.BooleanField(read_only=True)
    edit_deadline = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ConsultationReview
        fields = [
            "id",
            "booking",
            "rating",
            "review",
            "submitted_at",
            "updated_at",
            "edit_deadline",
            "can_edit",
        ]
        read_only_fields = ["id", "booking", "submitted_at", "updated_at", "edit_deadline", "can_edit"]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate_review(self, value):
        return (value or "").strip()
