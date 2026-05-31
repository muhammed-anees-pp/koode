from django.contrib import admin

from reviews.models import ConsultationReview


@admin.register(ConsultationReview)
class ConsultationReviewAdmin(admin.ModelAdmin):
    list_display = ("booking", "patient", "psychologist", "rating", "submitted_at", "updated_at")
    search_fields = (
        "booking__id",
        "patient__patient_id",
        "patient__user__full_name",
        "psychologist__psychologist_id",
        "psychologist__user__full_name",
    )
    list_filter = ("rating", "submitted_at")
