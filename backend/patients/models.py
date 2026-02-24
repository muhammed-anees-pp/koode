import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


"""
PATIENT PROFILE
"""
class PatientProfile(models.Model):

    GENDER_CHOICES = (
        ("MALE", "Male"),
        ("FEMALE", "Female"),
        ("OTHER", "Other"),
    )

    patient_id = models.CharField(primary_key=True, max_length=12, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="patient_profile")
    phone_number = models.CharField(max_length=15, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    emergency_contact_name = models.CharField(max_length=255, blank=True)
    emergency_contact_number = models.CharField(max_length=15, blank=True)
    is_deactivated = models.BooleanField(default=False)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateField(auto_now_add=True)
    updated_at = models.DateField(auto_now=True)

    # PATIENT ID
    def generate_patient_id(self):
        return f"PT-{uuid.uuid4().hex[:8].upper()}"
    
    def save(self, *args, **kwargs):
        if not self.patient_id:
            while True:
                new_id = self.generate_patient_id()
                if not PatientProfile.objects.filter(patient_id=new_id).exists():
                    self.patient_id = new_id
                    break
        super().save(*args, **kwargs)

    def deactivate(self):
        self.is_deactivated = True
        self.active = False
        self.deactivated_at = timezone.now()
        self.save()

    def __str__(self):
        return f"{self.patient_id} - {self.user.email}"

    