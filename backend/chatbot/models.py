from django.conf import settings
from django.db import models
from django.utils import timezone


"""
CHAT BOT CONVERSATION
"""
class ChatbotConversation(models.Model):
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chatbot_conversations",)
    title = models.CharField(max_length=120, default="AI assistant")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["patient", "-updated_at"], name="chatbot_ch_patient_7699f1_idx"),
        ]

    def __str__(self):
        return f"{self.title} - {self.patient.email}"


"""
CHAT BOT MESSAGE
"""
class ChatbotMessage(models.Model):
    ROLE_CHOICES = (
        ("USER", "User"),
        ("BOT", "Bot"),
    )

    conversation = models.ForeignKey(ChatbotConversation, on_delete=models.CASCADE, related_name="messages",)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    intent = models.CharField(max_length=80, blank=True)
    confidence = models.FloatField(default=0)
    quick_replies = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"], name="chatbot_ch_convers_f5a5b4_idx"),
        ]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"
