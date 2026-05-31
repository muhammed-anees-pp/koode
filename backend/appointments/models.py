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

    id = models.CharField(primary_key=True, max_length=36, editable=False)
    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="bookings")
    psychologist = models.ForeignKey(PsychologistProfile, on_delete=models.CASCADE, related_name="bookings")
    slot = models.OneToOneField(AvailableSlot, on_delete=models.SET_NULL, related_name="booking", null=True, blank=True,)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20,choices=STATUS_CHOICES,default="PENDING")
    payment_status = models.CharField(max_length=20,choices=PAYMENT_STATUS_CHOICES,default="PENDING")
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    wallet_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    razorpay_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    psychologist_paid_at = models.DateTimeField(null=True, blank=True)
    meeting_link = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    cancelled_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="cancelled_bookings")
    created_at = models.DateTimeField(auto_now_add=True)

    def generate_appointment_id(self):
        return f"AP-{uuid.uuid4().hex[:8].upper()}"

    def save(self, *args, **kwargs):
        if not self.id:
            while True:
                new_id = self.generate_appointment_id()
                if not Booking.objects.filter(id=new_id).exists():
                    self.id = new_id
                    break

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.patient} → {self.psychologist} ({self.date} {self.start_time})"
