import uuid
from django.conf import settings
from django.db import models



"""
COMPLAINT
"""
class Complaint(models.Model):
    CATEGORY_PSYCHOLOGIST_BEHAVIOR = "PSYCHOLOGIST_BEHAVIOR"
    CATEGORY_SESSION_ENDED_EARLY = "SESSION_ENDED_EARLY"
    CATEGORY_CONSULTATION_QUALITY = "CONSULTATION_QUALITY"
    CATEGORY_TECHNICAL_ISSUE = "TECHNICAL_ISSUE"
    CATEGORY_PRIVACY_CONCERN = "PRIVACY_CONCERN"
    CATEGORY_PAYMENT_ISSUE = "PAYMENT_ISSUE"
    CATEGORY_OTHER = "OTHER"

    CATEGORY_CHOICES = (
        (CATEGORY_PSYCHOLOGIST_BEHAVIOR, "Psychologist behavior"),
        (CATEGORY_SESSION_ENDED_EARLY, "Session ended early"),
        (CATEGORY_CONSULTATION_QUALITY, "Consultation quality"),
        (CATEGORY_TECHNICAL_ISSUE, "Technical issue"),
        (CATEGORY_PRIVACY_CONCERN, "Privacy concern"),
        (CATEGORY_PAYMENT_ISSUE, "Payment issue"),
        (CATEGORY_OTHER, "Other"),
    )

    STATUS_PENDING = "PENDING_REVIEW"
    STATUS_UNDER_REVIEW = "UNDER_REVIEW"
    STATUS_PSYCHOLOGIST_RESPONSE_PENDING = "PSYCHOLOGIST_RESPONSE_PENDING"
    STATUS_PSYCHOLOGIST_RESPONSE_SUBMITTED = "PSYCHOLOGIST_RESPONSE_SUBMITTED"
    STATUS_RESOLVED = "RESOLVED"
    STATUS_REJECTED = "REJECTED"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending Review"),
        (STATUS_UNDER_REVIEW, "Under Review"),
        (STATUS_PSYCHOLOGIST_RESPONSE_PENDING, "Psychologist Response Pending"),
        (STATUS_PSYCHOLOGIST_RESPONSE_SUBMITTED, "Psychologist Response Submitted"),
        (STATUS_RESOLVED, "Resolved"),
        (STATUS_REJECTED, "Rejected"),
    )

    SEVERITY_LOW = "LOW"
    SEVERITY_MEDIUM = "MEDIUM"
    SEVERITY_HIGH = "HIGH"

    SEVERITY_CHOICES = (
        (SEVERITY_LOW, "Low"),
        (SEVERITY_MEDIUM, "Medium"),
        (SEVERITY_HIGH, "High"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint_id = models.CharField(max_length=32, unique=True, editable=False)
    booking = models.OneToOneField("appointments.Booking", on_delete=models.CASCADE, related_name="complaint")
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="complaints")
    psychologist = models.ForeignKey("psychologists.PsychologistProfile", on_delete=models.CASCADE, related_name="complaints")
    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES)
    subject = models.CharField(max_length=180)
    description = models.TextField()
    status = models.CharField(max_length=40, choices=STATUS_CHOICES, default=STATUS_PENDING)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default=SEVERITY_MEDIUM)
    show_to_psychologist = models.BooleanField(default=False)
    complaint_allowed_until = models.DateTimeField()
    admin_response = models.TextField(blank=True)
    admin_request_message = models.TextField(blank=True)
    internal_admin_note = models.TextField(blank=True)
    psychologist_response = models.TextField(blank=True)
    psychologist_response_requested_at = models.DateTimeField(null=True, blank=True)
    psychologist_responded_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="resolved_complaints")
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "status", "created_at"]),
            models.Index(fields=["psychologist", "status", "created_at"]),
            models.Index(fields=["show_to_psychologist", "status", "created_at"]),
            models.Index(fields=["severity", "created_at"]),
            models.Index(fields=["complaint_id"]),
        ]

    def save(self, *args, **kwargs):
        if not self.complaint_id:
            self.complaint_id = self._generate_complaint_id()
        super().save(*args, **kwargs)

    @classmethod
    def _generate_complaint_id(cls):
        from django.utils import timezone

        prefix = timezone.localtime().strftime("CMP%Y%m%d")
        latest = (
            cls.objects.filter(complaint_id__startswith=prefix)
            .order_by("-complaint_id")
            .first()
        )
        sequence = 1
        if latest:
            try:
                sequence = int(latest.complaint_id[-4:]) + 1
            except ValueError:
                sequence = 1
        return f"{prefix}{sequence:04d}"

    @property
    def actual_end_time(self):
        consultation = getattr(self.booking, "consultation_session", None)
        return getattr(consultation, "ended_at", None)

    def __str__(self):
        return f"{self.complaint_id} - {self.subject}"


"""
COMPLAINT ATTACHMENT
"""
class ComplaintAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="complaints/evidence/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment for {self.complaint.complaint_id}"


"""
COMPLAINT ATTACHMENT OF PSYCHOLOGIST
"""
class PsychologistComplaintAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="psychologist_attachments")
    file = models.FileField(upload_to="complaints/psychologist-evidence/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Psychologist attachment for {self.complaint.complaint_id}"


"""
COMPLAINT TIMELINE EVENT
"""
class ComplaintTimelineEvent(models.Model):
    EVENT_SUBMITTED = "SUBMITTED"
    EVENT_STATUS_CHANGED = "STATUS_CHANGED"
    EVENT_ADMIN_RESPONSE = "ADMIN_RESPONSE"
    EVENT_PSYCHOLOGIST_REQUESTED = "PSYCHOLOGIST_REQUESTED"
    EVENT_PSYCHOLOGIST_RESPONDED = "PSYCHOLOGIST_RESPONDED"
    EVENT_RESOLVED = "RESOLVED"
    EVENT_REJECTED = "REJECTED"

    EVENT_CHOICES = (
        (EVENT_SUBMITTED, "Complaint Submitted"),
        (EVENT_STATUS_CHANGED, "Status Changed"),
        (EVENT_ADMIN_RESPONSE, "Admin Response Added"),
        (EVENT_PSYCHOLOGIST_REQUESTED, "Psychologist Response Requested"),
        (EVENT_PSYCHOLOGIST_RESPONDED, "Psychologist Responded"),
        (EVENT_RESOLVED, "Complaint Resolved"),
        (EVENT_REJECTED, "Complaint Rejected"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="timeline")
    event_type = models.CharField(max_length=40, choices=EVENT_CHOICES)
    title = models.CharField(max_length=180)
    note = models.TextField(blank=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["complaint", "created_at"]),
        ]

    def __str__(self):
        return f"{self.complaint.complaint_id}: {self.title}"
