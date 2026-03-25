from django.db import models
import uuid
from django.conf import settings

"""
SEPCIALIZATIONS MODEL
"""
class Specialization(models.Model):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
    


"""
PSYCHOLOGIST PROFILE
"""
class PsychologistProfile(models.Model):
    psychologist_id = models.CharField(primary_key=True, max_length=12, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="psychologist_profile")
    audio_intro = models.FileField(upload_to="psychologists/audio_intro/", null=True, blank=True)
    phone_number = models.CharField(max_length=15)
    about = models.TextField()
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    job_title = models.CharField(max_length=255)
    years_of_experience = models.PositiveIntegerField()
    specializations = models.ManyToManyField(Specialization, related_name="psychologists", blank=True)
    consultation_fee = models.DecimalField(max_digits=8, decimal_places=2)
    certificate_document = models.FileField(upload_to="psychologists/certificates/")
    total_session_minutes = models.PositiveIntegerField(default=0)
    verified = models.BooleanField(default=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def generate_psychologist_id(self):
        return f"PSY-{uuid.uuid4().hex[:8].upper()}"

    def save(self, *args, **kwargs):
        if not self.psychologist_id:
            while True:
                new_id = self.generate_psychologist_id()
                if not PsychologistProfile.objects.filter(psychologist_id=new_id).exists():
                    self.psychologist_id = new_id
                    break

        super().save(*args, **kwargs)

    @property
    def total_experience_hours(self):
        return round(self.total_session_minutes / 60, 2)

    def __str__(self):
        return f"{self.psychologist_id} - {self.user.email}"