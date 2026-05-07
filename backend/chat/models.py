import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from appointments.models import Booking
from patients.models import PatientProfile
from psychologists.models import PsychologistProfile


"""
CHAT ROOM
"""
class ChatRoom(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="chat_room",
    )
    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name="chat_rooms",
    )
    psychologist = models.ForeignKey(
        PsychologistProfile,
        on_delete=models.CASCADE,
        related_name="chat_rooms",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["patient", "is_active"]),
            models.Index(fields=["psychologist", "is_active"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["patient", "psychologist"],
                name="unique_chat_room_per_patient_psychologist",
            ),
        ]

    def __str__(self):
        return f"Chat between {self.patient_id} and {self.psychologist_id}"

    def can_participate(self, user):
        return user.is_authenticated and user.id in {
            self.patient.user_id,
            self.psychologist.user_id,
        }

    def sync_active_state(self, save=True):
        active_booking = Booking.objects.filter(
            patient_id=self.patient_id,
            psychologist_id=self.psychologist_id,
            status="CONFIRMED",
        ).order_by("date", "start_time", "-created_at").first()

        if active_booking:
            self.appointment = active_booking
            self.is_active = True
        else:
            self.is_active = False

        if save:
            self.save(update_fields=["appointment", "is_active", "updated_at"])
        return self.is_active


"""
MESSAGE
"""
class Message(models.Model):
    MESSAGE_TYPE_TEXT = "TEXT"
    MESSAGE_TYPE_FILE = "FILE"
    MESSAGE_TYPE_CHOICES = (
        (MESSAGE_TYPE_TEXT, "Text"),
        (MESSAGE_TYPE_FILE, "File"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages")
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPE_CHOICES, default=MESSAGE_TYPE_TEXT)
    content = models.TextField(blank=True)
    attachment = models.FileField(upload_to="chat/attachments/%Y/%m/", null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True)
    attachment_size = models.PositiveIntegerField(null=True, blank=True)
    attachment_content_type = models.CharField(max_length=120, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["room", "created_at"]),
            models.Index(fields=["sender", "created_at"]),
        ]

    def __str__(self):
        return f"{self.sender_id}: {self.content[:40]}"

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])
