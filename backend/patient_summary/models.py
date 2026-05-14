from django.db import models
from consultations.models import Consultation
from patients.models import PatientProfile


"""
PATIENT SUMMARY
"""
class PatientSummary(models.Model):
    STATUS_CHOICES = (
        ("READY", "Ready"),
        ("FAILED", "Failed"),
        ("SKIPPED", "Skipped"),
    )

    patient = models.OneToOneField(PatientProfile, on_delete=models.CASCADE, related_name="summary_report",)
    summary = models.TextField(blank=True)
    last_consultation = models.ForeignKey(Consultation, on_delete=models.SET_NULL, null=True, blank=True, related_name="summary_updates",)
    model = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="SKIPPED")
    error_message = models.TextField(blank=True)
    generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["status", "generated_at"]),]

    def __str__(self):
        return f"Summary report for {self.patient_id}"
