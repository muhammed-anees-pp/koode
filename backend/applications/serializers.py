import re
import os
from rest_framework import serializers
from .models import PsychologistApplication


"""
PSYCHOLOGIST APPLICATION SERIALIZER
"""
class PsychologistApplicationSerializer(serializers.ModelSerializer):

    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    specializations = serializers.SerializerMethodField()
    interview_id = serializers.SerializerMethodField()
    interview_status = serializers.SerializerMethodField()

    def get_specializations(self, obj):
        return [{"id": s.id, "name": s.name} for s in obj.specializations.all()]

    def get_interview_id(self, obj):
        try:
            interview = obj.interview
            return str(interview.id) if interview else None
        except Exception:
            return None

    def get_interview_status(self, obj):
        try:
            interview = obj.interview
            return interview.status if interview else None
        except Exception:
            return None

    class Meta:
        model = PsychologistApplication
        fields = [
            "id", "profile_picture", "audio_intro", "full_name", "email", "phone_number", "about", "street_address", "city", "state",
            "pincode", "country", "job_title", "years_of_experience", "highest_education", "certificate_document", "specializations", "consultation_fee",
            "status", "submitted_at", "interview_date", "interview_id", "interview_status", "admin_notes",
        ]
        read_only_fields = ["status", "submitted_at",]


"""
PSYCHOLOGIST APPLICATION SUBMIT SERIALIZER
"""
class ApplicationSubmitSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = PsychologistApplication
        fields = [
            "full_name", "profile_picture", "audio_intro", "phone_number", "about", "street_address", "city", "state", "pincode", "country",
            "job_title", "years_of_experience", "highest_education", "certificate_document", "specializations", "consultation_fee",
        ]

    # VALIDATIONS
    def validate_full_name(self, value):
        if value:
            if not re.match(r"^[a-zA-Z\s.\'-]+$", value):
                raise serializers.ValidationError("Full name must contain letters, spaces, dots, apostrophes, or hyphens only.")
            if len(value.strip()) < 2:
                raise serializers.ValidationError("Full name must be at least 2 characters.")
        return value

    def validate_phone_number(self, value):
        value = value.strip()
        if not re.match(r"^\d{10,15}$", value):
            raise serializers.ValidationError("Phone number must be 10–15 digits with no spaces or special characters.")
        return value

    def validate_about(self, value):
        if len(value.strip()) < 50:
            raise serializers.ValidationError("About section must be at least 50 characters.")
        if len(value.strip()) > 2000:
            raise serializers.ValidationError("About section must be under 2000 characters.")
        return value

    def validate_city(self, value):
        if not re.match(r"^[a-zA-Z\s\'-]+$", value):
            raise serializers.ValidationError("City must contain letters only.")
        return value

    def validate_state(self, value):
        if not re.match(r"^[a-zA-Z\s\'-]+$", value):
            raise serializers.ValidationError("State must contain letters only.")
        return value

    def validate_pincode(self, value):
        if not re.match(r"^\d{4,10}$", value):
            raise serializers.ValidationError("Pincode must be 4–10 digits.")
        return value

    def validate_job_title(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Job title must be at least 3 characters.")
        if not re.match(r"^[a-zA-Z\s.,'\(\)\-]+$", value):
            raise serializers.ValidationError("Job title must not contain special characters.")
        return value

    def validate_years_of_experience(self, value):
        if value < 0 or value > 60:
            raise serializers.ValidationError("Experience must be between 0 and 60 years.")
        return value

    def validate_highest_education(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Qualification must be at least 3 characters.")
        return value

    def validate_consultation_fee(self, value):
        if value <= 0:
            raise serializers.ValidationError("Consultation fee must be a positive amount.")
        return value

    def validate_profile_picture(self, value):
        allowed_types = ["image/jpeg", "image/png"]
        content_type = getattr(value, "content_type", None)
        if content_type and content_type not in allowed_types:
            raise serializers.ValidationError("Profile picture must be a JPEG or PNG image.")
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png"]:
            raise serializers.ValidationError("Profile picture must be a .jpg, .jpeg, or .png file.")
        max_mb = 5
        if value.size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(f"Profile picture must be under {max_mb}MB.")
        return value

    def validate_audio_intro(self, value):
        if value:
            allowed_exts = [".mp3", ".mp4", ".m4a", ".ogg", ".wav", ".webm", ".aac"]
            ext = os.path.splitext(value.name)[1].lower()
            if ext not in allowed_exts:
                raise serializers.ValidationError("Audio introduction must be an audio file (MP3, M4A, WAV, OGG, etc.).")
            max_mb = 10
            if value.size > max_mb * 1024 * 1024:
                raise serializers.ValidationError(f"Audio introduction must be under {max_mb}MB.")
        return value

    def validate_certificate_document(self, value):
        content_type = getattr(value, "content_type", None)
        if content_type and content_type != "application/pdf":
            raise serializers.ValidationError("Qualification certificate must be a PDF file.")
        ext = os.path.splitext(value.name)[1].lower()
        if ext != ".pdf":
            raise serializers.ValidationError("Qualification certificate must be a .pdf file.")
        max_mb = 10
        if value.size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(f"Certificate must be under {max_mb}MB.")
        return value

    def validate_specializations(self, value):
        if not value:
            raise serializers.ValidationError("Please select at least one specialization.")
        return value


"""
ADMIN UPDATE APPLICATION SERIALIZER
"""
class AdminUpdateApplicationSerializer(serializers.ModelSerializer):
    ALLOWED_STATUSES = ["DRAFT", "SUBMITTED", "INTERVIEW_SCHEDULED", "REJECTED"]

    status = serializers.ChoiceField(choices=[(s, s) for s in ALLOWED_STATUSES],required=False,)
    admin_notes = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = PsychologistApplication
        fields = ["status", "admin_notes"]

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


"""
ADMIN SCHEDULE INTERVIEW SERIALIZER
"""
class AdminScheduleInterviewSerializer(serializers.Serializer):
    interview_date = serializers.DateTimeField(required=True)
    admin_notes = serializers.CharField(required=False, allow_blank=True)