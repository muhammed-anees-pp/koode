import uuid
from django.conf import settings
from django.db import models
from appointments.models import Booking


"""
CONSULTATION MODEL
"""
class Consultation(models.Model):
    STATUS_CHOICES = (
        ("SCHEDULED", "Scheduled"),
        ("WAITING", "Waiting"),
        ("ONGOING", "Ongoing"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    )

    RECORDING_STATUS_CHOICES = (
        ("NOT_STARTED", "Not Started"),
        ("STARTING", "Starting"),
        ("RECORDING", "Recording"),
        ("STOPPING", "Stopping"),
        ("UPLOADED", "Uploaded"),
        ("FAILED", "Failed"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE,related_name="consultation_session",)
    room_id = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="SCHEDULED")
    psychologist_joined = models.BooleanField(default=False)
    patient_joined = models.BooleanField(default=False)
    patient_requested_join = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    zego_recording_task_id = models.CharField(max_length=80, blank=True)
    recording_status = models.CharField(max_length=20, choices=RECORDING_STATUS_CHOICES, default="NOT_STARTED",)
    recording_file_url = models.URLField(max_length=1000, blank=True)
    recording_metadata = models.JSONField(default=dict, blank=True)
    patient_note = models.TextField(blank=True)
    psychologist_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "started_at"]),
            models.Index(fields=["recording_status"]),
        ]

    def __str__(self):
        return f"Consultation {self.room_id}"


"""
CONSULTATION ROOM CHAT
"""
class ConsultationMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name="messages",)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="consultation_messages",)
    text = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sent_at"]
        indexes = [
            models.Index(fields=["consultation", "sent_at"]),
        ]

    def __str__(self):
        return f"{self.sender_id}: {self.text[:40]}"
