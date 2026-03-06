import uuid
from django.db import models
from django.conf import settings
from psychologists.models import Specialization


"""
APPLICATIONS MODEL
"""
class PsychologistApplication(models.Model):
    STATUS_CHOICES = (
        ("DRAFT", "Draft"),
        ("SUBMITTED", "Submitted"),
        ("INTERVIEW_SCHEDULED", "Interview Scheduled"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="psychologist_application")
    profile_picture = models.ImageField(upload_to="applications/profile_pictures/", null=True, blank=True)
    audio_intro = models.FileField(upload_to="applications/audio_intro/", null=True, blank=True)
    phone_number = models.CharField(max_length=15)
    about = models.TextField()
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    job_title = models.CharField(max_length=255)
    years_of_experience = models.PositiveIntegerField()
    highest_education = models.CharField(max_length=255)
    certificate_document = models.FileField(upload_to="applications/certificates/")
    specializations = models.ManyToManyField(Specialization)
    consultation_fee = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="DRAFT")
    interview_date = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - {self.status}"