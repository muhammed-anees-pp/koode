import uuid
from datetime import timedelta
from django.db import models
from django.utils import timezone


"""
REVIEW
"""
class ConsultationReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField("appointments.Booking", on_delete=models.CASCADE, related_name="review")
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="consultation_reviews")
    psychologist = models.ForeignKey("psychologists.PsychologistProfile", on_delete=models.CASCADE, related_name="consultation_reviews")
    rating = models.PositiveSmallIntegerField()
    review = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-submitted_at"]
        indexes = [
            models.Index(fields=["psychologist", "patient", "submitted_at"]),
            models.Index(fields=["booking"]),
        ]

    @property
    def edit_deadline(self):
        return self.submitted_at + timedelta(minutes=15)

    @property
    def can_edit(self):
        return timezone.now() <= self.edit_deadline

    def __str__(self):
        return f"{self.patient_id} -> {self.psychologist_id}: {self.rating}"
