import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from applications.models import PsychologistApplication


"""
INTERVIEW MODEL
"""
class Interview(models.Model):
    STATUS_CHOICES = (
        ("SCHEDULED", "Scheduled"),
        ("WAITING", "Waiting Room"),
        ("ONGOING", "Ongoing"),
        ("COMPLETED", "Completed"),
        ("CANCELLED", "Cancelled"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.OneToOneField(PsychologistApplication, on_delete=models.CASCADE, related_name="interview")
    admin = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conducted_interviews")
    scheduled_at = models.DateTimeField()
    room_id = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="SCHEDULED")
    admin_joined = models.BooleanField(default=False)
    psychologist_joined = models.BooleanField(default=False)
    join_requested = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # WAITING ROOM
    def is_waiting_room_open(self):
        now = timezone.now()
        return self.scheduled_at - timedelta(minutes=5) <= now < self.scheduled_at

    def can_join_room(self):
        return timezone.now() >= self.scheduled_at

    def __str__(self):
        return f"Interview for {self.application.user.email}"


"""
CHAT IN MEETING
"""
class ChatMessage(models.Model):
    interview = models.ForeignKey(Interview, on_delete=models.CASCADE, related_name="messages")
    sender_name = models.CharField(max_length=150)
    is_admin = models.BooleanField(default=False)
    text = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sent_at"]

    def __str__(self):
        role = "Admin" if self.is_admin else "Psychologist"
        return f"[{role}] {self.sender_name}: {self.text[:40]}"