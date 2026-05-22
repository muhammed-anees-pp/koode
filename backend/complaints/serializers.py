from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers
from appointments.models import Booking
from complaints.models import (
    Complaint, ComplaintAttachment, ComplaintTimelineEvent, PsychologistComplaintAttachment,
)
from complaints.services import complaint_eligibility_for_booking
from notifications.services import create_notification, notify_many


def complaint_consultation_payload(booking):
    consultation = getattr(booking, "consultation_session", None)
    return {
        "booking_id": str(booking.id),
        "date": booking.date,
        "start_time": booking.start_time,
        "end_time": booking.end_time,
        "actual_end_time": getattr(consultation, "ended_at", None),
        "psychologist": {
            "psychologist_id": booking.psychologist.psychologist_id,
            "full_name": booking.psychologist.user.full_name,
            "email": booking.psychologist.user.email,
            "department": getattr(booking.psychologist, "specialization", "") or "Clinical Psychology",
        },
        "patient": {
            "patient_id": booking.patient.patient_id,
            "full_name": booking.patient.user.full_name,
            "email": booking.patient.user.email,
        },
        "session": {
            "started_at": getattr(consultation, "started_at", None),
            "ended_at": getattr(consultation, "ended_at", None),
            "patient_joined": getattr(consultation, "patient_joined", False),
            "psychologist_joined": getattr(consultation, "psychologist_joined", False),
        },
    }


"""
COMPLAINT ATTACHEMENTS
"""
class ComplaintAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()

    class Meta:
        model = ComplaintAttachment
        fields = ["id", "file", "file_url", "file_name", "uploaded_at"]
        read_only_fields = ["id", "file_url", "file_name", "uploaded_at"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return None
        try:
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        except Exception:
            return None

    def get_file_name(self, obj):
        return obj.file.name.rsplit("/", 1)[-1] if obj.file else None


"""
COMPLAINT TIMELINE
"""
class ComplaintTimelineEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)

    class Meta:
        model = ComplaintTimelineEvent
        fields = ["id", "event_type", "title", "note", "actor_name", "created_at"]
        read_only_fields = fields


"""
PSYCHOLOGIST COMPLAINT ATTACHMENT
"""
class PsychologistComplaintAttachmentSerializer(ComplaintAttachmentSerializer):
    class Meta:
        model = PsychologistComplaintAttachment
        fields = ["id", "file", "file_url", "file_name", "uploaded_at"]
        read_only_fields = ["id", "file_url", "file_name", "uploaded_at"]


"""
COMPLAINT BOOKING SERIALIZER AFTER CONSULTATION
"""
class EligibleComplaintBookingSerializer(serializers.ModelSerializer):
    psychologist_name = serializers.CharField(source="psychologist.user.full_name", read_only=True)
    psychologist_id = serializers.CharField(source="psychologist.psychologist_id", read_only=True)
    actual_end_time = serializers.SerializerMethodField()
    complaint_allowed_until = serializers.SerializerMethodField()
    complaint_eligibility = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "psychologist_id",
            "psychologist_name",
            "date",
            "start_time",
            "end_time",
            "actual_end_time",
            "complaint_allowed_until",
            "complaint_eligibility",
        ]

    def _eligibility(self, obj):
        patient = self.context.get("patient")
        return complaint_eligibility_for_booking(obj, patient=patient)

    def get_actual_end_time(self, obj):
        return self._eligibility(obj)["actual_end_time"]

    def get_complaint_allowed_until(self, obj):
        return self._eligibility(obj)["complaint_allowed_until"]

    def get_complaint_eligibility(self, obj):
        return self._eligibility(obj)


"""
COMPLAINT SERIALIZER
"""
class ComplaintSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)
    consultation = serializers.SerializerMethodField()
    attachments = ComplaintAttachmentSerializer(many=True, read_only=True)
    psychologist_attachments = PsychologistComplaintAttachmentSerializer(many=True, read_only=True)
    timeline = ComplaintTimelineEventSerializer(many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id",
            "complaint_id",
            "booking",
            "category",
            "category_display",
            "subject",
            "description",
            "status",
            "status_display",
            "severity",
            "severity_display",
            "show_to_psychologist",
            "complaint_allowed_until",
            "admin_response",
            "admin_request_message",
            "psychologist_response",
            "psychologist_response_requested_at",
            "psychologist_responded_at",
            "resolved_by",
            "resolved_at",
            "created_at",
            "updated_at",
            "consultation",
            "attachments",
            "psychologist_attachments",
            "timeline",
        ]
        read_only_fields = [
            "id",
            "complaint_id",
            "booking",
            "status",
            "status_display",
            "show_to_psychologist",
            "complaint_allowed_until",
            "admin_response",
            "admin_request_message",
            "psychologist_response",
            "psychologist_response_requested_at",
            "psychologist_responded_at",
            "resolved_by",
            "resolved_at",
            "created_at",
            "updated_at",
            "consultation",
            "attachments",
            "psychologist_attachments",
            "timeline",
        ]

    def get_consultation(self, obj):
        return complaint_consultation_payload(obj.booking)


"""
CREATE COMPLAINT SERIALIZER
"""
class CreateComplaintSerializer(serializers.Serializer):
    category = serializers.ChoiceField(
        choices=Complaint.CATEGORY_CHOICES,
        error_messages={
            "required": "Please select an issue type.",
            "invalid_choice": "Please select a valid issue type.",
        },
    )
    severity = serializers.ChoiceField(
        choices=Complaint.SEVERITY_CHOICES,
        required=False,
        default=Complaint.SEVERITY_MEDIUM,
        error_messages={"invalid_choice": "Please select a valid severity."},
    )
    subject = serializers.CharField(
        max_length=180,
        trim_whitespace=True,
        error_messages={
            "blank": "Subject is required.",
            "required": "Subject is required.",
            "max_length": "Subject must be 180 characters or fewer.",
        },
    )
    description = serializers.CharField(
        trim_whitespace=True,
        error_messages={
            "blank": "Description is required.",
            "required": "Description is required.",
        },
    )
    evidence = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        allow_empty=True,
        write_only=True,
    )

    def validate_subject(self, value):
        if not value.strip():
            raise serializers.ValidationError("Subject is required.")
        return value.strip()

    def validate_description(self, value):
        if not value.strip():
            raise serializers.ValidationError("Description is required.")
        return value.strip()

    def validate(self, attrs):
        booking = self.context["booking"]
        patient = self.context["patient"]
        eligibility = complaint_eligibility_for_booking(booking, patient=patient)
        if not eligibility["can_raise"]:
            raise serializers.ValidationError(eligibility["reason"] or "Complaint cannot be raised for this appointment.")
        attrs["complaint_allowed_until"] = eligibility["complaint_allowed_until"]
        return attrs

    def create(self, validated_data):
        booking = self.context["booking"]
        patient = self.context["patient"]
        actor = self.context["request"].user
        evidence = validated_data.pop("evidence", [])

        with transaction.atomic():
            complaint = Complaint.objects.create(
                booking=booking,
                patient=patient,
                psychologist=booking.psychologist,
                category=validated_data["category"],
                severity=validated_data.get("severity", Complaint.SEVERITY_MEDIUM),
                subject=validated_data["subject"],
                description=validated_data["description"],
                complaint_allowed_until=validated_data["complaint_allowed_until"],
            )
            for file in evidence:
                ComplaintAttachment.objects.create(complaint=complaint, file=file)
            ComplaintTimelineEvent.objects.create(
                complaint=complaint,
                event_type=ComplaintTimelineEvent.EVENT_SUBMITTED,
                title="Complaint Submitted",
                note="Complaint submitted by patient.",
                actor=actor,
            )

            User = get_user_model()
            admins = User.objects.filter(role="ADMIN", is_active=True)
            notify_many(
                admins,
                f"New complaint {complaint.complaint_id} submitted by {patient.user.full_name}.",
                target_url="/admin/complaints",
            )
        return complaint


"""
ADMIN COMPLAINT ACTIONS
"""
class AdminComplaintActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=["resolve", "reject", "send_to_psychologist"],
        error_messages={
            "required": "Please choose an action.",
            "invalid_choice": "Please choose a valid action.",
        },
    )
    message = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    severity = serializers.ChoiceField(
        choices=Complaint.SEVERITY_CHOICES,
        required=False,
        error_messages={"invalid_choice": "Please choose a valid severity."},
    )

    def validate(self, attrs):
        action = attrs["action"]
        if action in {"resolve", "reject", "send_to_psychologist"} and not attrs.get("message", "").strip():
            label = "resolution message" if action == "resolve" else "reason" if action == "reject" else "message to psychologist"
            raise serializers.ValidationError({"message": f"Provide {label}."})
        return attrs

    def update(self, instance, validated_data):
        actor = self.context["request"].user
        action = validated_data["action"]
        message = validated_data.get("message", "")
        old_status = instance.status
        now = timezone.now()
        update_fields = ["updated_at"]

        if "severity" in validated_data:
            instance.severity = validated_data["severity"]
            update_fields.append("severity")
        event_type = ComplaintTimelineEvent.EVENT_STATUS_CHANGED
        event_title = "Complaint Updated"
        patient_notification = None
        psychologist_notification = None

        if action == "resolve":
            instance.status = Complaint.STATUS_RESOLVED
            instance.admin_response = message
            instance.resolved_at = now
            instance.resolved_by = actor
            update_fields += ["status", "admin_response", "resolved_at", "resolved_by"]
            event_type = ComplaintTimelineEvent.EVENT_RESOLVED
            event_title = "Complaint Resolved"
            patient_notification = f"Your complaint {instance.complaint_id} has been resolved."
        elif action == "reject":
            instance.status = Complaint.STATUS_REJECTED
            instance.admin_response = message
            instance.resolved_at = now
            instance.resolved_by = actor
            update_fields += ["status", "admin_response", "resolved_at", "resolved_by"]
            event_type = ComplaintTimelineEvent.EVENT_REJECTED
            event_title = "Complaint Rejected"
            patient_notification = f"Your complaint {instance.complaint_id} has been rejected."
        elif action == "send_to_psychologist":
            reported_psychologist = instance.booking.psychologist
            instance.status = Complaint.STATUS_UNDER_REVIEW
            instance.show_to_psychologist = True
            instance.psychologist = reported_psychologist
            instance.admin_request_message = message
            instance.psychologist_response_requested_at = now
            instance.resolved_at = None
            instance.resolved_by = None
            update_fields += [
                "status",
                "show_to_psychologist",
                "psychologist",
                "admin_request_message",
                "psychologist_response_requested_at",
                "resolved_at",
                "resolved_by",
            ]
            event_type = ComplaintTimelineEvent.EVENT_PSYCHOLOGIST_REQUESTED
            event_title = "Psychologist Response Requested"
            patient_notification = f"Your complaint {instance.complaint_id} is under review."
            psychologist_notification = f"Complaint {instance.complaint_id} has been raised against you. Admin requested your response."
        with transaction.atomic():
            instance.save(update_fields=update_fields)

            ComplaintTimelineEvent.objects.create(
                complaint=instance,
                event_type=event_type,
                title=event_title if old_status == instance.status else instance.get_status_display(),
                note=message,
                actor=actor,
            )

            if patient_notification:
                create_notification(
                    instance.patient.user,
                    patient_notification,
                    target_url="/patient/complaints",
                )
            if psychologist_notification:
                create_notification(
                    instance.booking.psychologist.user,
                    psychologist_notification,
                    target_url="/psychologist/complaints",
                )

        return instance


"""
PSYCHOLOGIST COMPLAINT SERIALIZER
"""
class PsychologistComplaintSerializer(ComplaintSerializer):
    class Meta(ComplaintSerializer.Meta):
        fields = [
            field for field in ComplaintSerializer.Meta.fields
            if field not in {"internal_admin_note", "resolved_by"}
        ]


"""
PSYCHOLOGIST COMPLAINT RESPONSE
"""
class PsychologistComplaintResponseSerializer(serializers.Serializer):
    response = serializers.CharField(
        trim_whitespace=True,
        error_messages={
            "blank": "Response is required.",
            "required": "Response is required.",
        },
    )
    evidence = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        allow_empty=True,
        write_only=True,
    )

    def validate_response(self, value):
        if not value.strip():
            raise serializers.ValidationError("Response is required.")
        return value.strip()

    def update(self, instance, validated_data):
        actor = self.context["request"].user
        evidence = validated_data.pop("evidence", [])
        now = timezone.now()

        with transaction.atomic():
            instance.psychologist_response = validated_data["response"]
            instance.psychologist_responded_at = now
            instance.status = Complaint.STATUS_PSYCHOLOGIST_RESPONSE_SUBMITTED
            instance.save(update_fields=[
                "psychologist_response",
                "psychologist_responded_at",
                "status",
                "updated_at",
            ])
            for file in evidence:
                PsychologistComplaintAttachment.objects.create(complaint=instance, file=file)
            ComplaintTimelineEvent.objects.create(
                complaint=instance,
                event_type=ComplaintTimelineEvent.EVENT_PSYCHOLOGIST_RESPONDED,
                title="Psychologist Submitted Response",
                note="Psychologist response submitted for admin review.",
                actor=actor,
            )

            User = get_user_model()
            admins = User.objects.filter(role="ADMIN", is_active=True)
            notify_many(
                admins,
                f"Psychologist submitted a response for complaint {instance.complaint_id}.",
                target_url=f"/admin/complaints/{instance.id}",
            )

        return instance
