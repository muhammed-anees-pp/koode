import uuid
from django.db import models
from psychologists.models import PsychologistProfile
from patients.models import PatientProfile


"""
PSYCHOLOGIST AVAILABILITY
"""
class Availability(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    psychologist = models.ForeignKey(PsychologistProfile, on_delete=models.CASCADE, related_name="availabilities")
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("psychologist", "date")

    def __str__(self):
        return f"{self.psychologist} - {self.date}"


"""
AVAILABLE SLOT
"""
class AvailableSlot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    availability = models.ForeignKey(Availability, on_delete=models.CASCADE, related_name="slots")
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_booked = models.BooleanField(default=False)

    class Meta:
        unique_together = ("availability", "start_time", "end_time")

    def __str__(self):
        return f"{self.availability.date} ({self.start_time} - {self.end_time})"


"""
BOOKING MODEL
"""
class Booking(models.Model):

    STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("CONFIRMED", "Confirmed"),
        ("CANCELLED", "Cancelled"),
        ("COMPLETED", "Completed"),
    )

    PAYMENT_STATUS_CHOICES = (
        ("PENDING", "Pending"),
        ("PAID", "Paid"),
        ("FAILED", "Failed"),
        ("REFUNDED", "Refunded"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="bookings")
    psychologist = models.ForeignKey(PsychologistProfile, on_delete=models.CASCADE, related_name="bookings")
    slot = models.OneToOneField(AvailableSlot, on_delete=models.CASCADE, related_name="booking")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20,choices=STATUS_CHOICES,default="PENDING")
    payment_status = models.CharField(max_length=20,choices=PAYMENT_STATUS_CHOICES,default="PENDING")
    meeting_link = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient} → {self.psychologist} ({self.date} {self.start_time})"