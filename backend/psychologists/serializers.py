from rest_framework import serializers
from accounts.models import User
from .models import Specialization, PsychologistProfile
from finance.services.amounts import calculate_commission_preview
import re


"""
SPECIALIZATION SERIALIZER
"""
class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = ["id", "name"]


"""
PSYCHOLOGIST PROFILE SERIALIZER
"""
class UserProfileSerializer(serializers.ModelSerializer):
    profile_picture = serializers.ImageField(required=False, allow_null=True, use_url=True)
    full_name = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = ["full_name", "email", "profile_picture"]
        read_only_fields = ["email"]

    def validate_full_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Full name must be at least 2 characters.")
        if len(value) > 100:
            raise serializers.ValidationError("Full name must be under 100 characters.")
        if not re.match(r"^[a-zA-Z\s.'\-]+$", value):
            raise serializers.ValidationError("Full name must contain only letters, spaces, dots, apostrophes, or hyphens.")
        return value

    def validate_profile_picture(self, value):
        if value is None:
            return value
        allowed = ["image/jpeg", "image/png", "image/gif"]
        if hasattr(value, "content_type") and value.content_type not in allowed:
            raise serializers.ValidationError("Only JPG, PNG, or GIF images are allowed.")
        if hasattr(value, "size") and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Profile photo must be under 5MB.")
        return value


"""
PSYCHOLOGIST PROFILE SERIALIZER
"""
class PsychologistProfileSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(required=False)
    specializations = SpecializationSerializer(many=True, read_only=True)
    specialization_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    phone_number        = serializers.CharField(required=False, allow_blank=True)
    about               = serializers.CharField(required=False, allow_blank=True)
    audio_intro         = serializers.FileField(required=False, allow_null=True, use_url=True)
    street_address      = serializers.CharField(required=False, allow_blank=True)
    city                = serializers.CharField(required=False, allow_blank=True)
    state               = serializers.CharField(required=False, allow_blank=True)
    pincode             = serializers.CharField(required=False, allow_blank=True)
    country             = serializers.CharField(required=False, allow_blank=True)
    job_title           = serializers.CharField(required=False, allow_blank=True)
    highest_education   = serializers.CharField(required=False, allow_blank=True)
    years_of_experience = serializers.IntegerField(required=False)
    consultation_fee    = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    commission_preview  = serializers.SerializerMethodField()

    class Meta:
        model = PsychologistProfile
        fields = [
            "psychologist_id", "user",
            "phone_number", "audio_intro", "about",
            "street_address", "city", "state", "pincode", "country",
            "job_title", "highest_education", "years_of_experience",
            "specializations", "specialization_ids", "consultation_fee",
            "commission_preview", "total_session_minutes", "created_at",
        ]
        read_only_fields = ["psychologist_id", "specializations", "commission_preview", "total_session_minutes", "created_at"]

    def get_commission_preview(self, obj):
        return calculate_commission_preview(obj.consultation_fee)


    def validate_phone_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Phone number is required.")
        if not re.match(r"^\d{10,15}$", value):
            raise serializers.ValidationError("Phone number must be 10–15 digits containing only numbers.")
        return value

    def validate_about(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("About section is required.")
        if len(value) < 50:
            raise serializers.ValidationError("About section must be at least 50 characters.")
        if len(value) > 2000:
            raise serializers.ValidationError("About section must be under 2000 characters.")
        return value

    def validate_street_address(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Street address is required.")
        if len(value) < 5:
            raise serializers.ValidationError("Street address must be at least 5 characters.")
        if len(value) > 255:
            raise serializers.ValidationError("Street address is too long.")
        return value

    def validate_city(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("City is required.")
        if len(value) < 2:
            raise serializers.ValidationError("City must be at least 2 characters.")
        if not re.match(r"^[a-zA-Z\s'\-]+$", value):
            raise serializers.ValidationError("City must contain only letters.")
        return value

    def validate_state(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("State is required.")
        if not re.match(r"^[a-zA-Z\s'\-]+$", value):
            raise serializers.ValidationError("State must contain only letters.")
        return value

    def validate_pincode(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Pincode is required.")
        if not re.match(r"^\d{4,10}$", value):
            raise serializers.ValidationError("Pincode must be 4–10 digits containing only numbers.")
        return value

    def validate_country(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Country is required.")
        return value

    def validate_job_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Job title is required.")
        if len(value) < 3:
            raise serializers.ValidationError("Job title must be at least 3 characters.")
        if len(value) > 255:
            raise serializers.ValidationError("Job title is too long.")
        return value

    def validate_highest_education(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Highest qualification is required.")
        if len(value) < 3:
            raise serializers.ValidationError("Qualification must be at least 3 characters.")
        return value

    def validate_years_of_experience(self, value):
        if value is None:
            raise serializers.ValidationError("Years of experience is required.")
        if value < 0 or value > 60:
            raise serializers.ValidationError("Years of experience must be between 0 and 60.")
        return value

    def validate_audio_intro(self, value):
        if value is None:
            return value
        allowed_exts = {".mp3", ".m4a", ".wav", ".ogg", ".webm", ".aac"}
        name = getattr(value, "name", "")
        ext = ("." + name.rsplit(".", 1)[-1].lower()) if "." in name else ""
        if ext not in allowed_exts:
            raise serializers.ValidationError("Only MP3, M4A, WAV, OGG, or AAC audio files are allowed.")
        if hasattr(value, "size") and value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Audio file must be under 10MB.")
        return value


    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", None)
        specialization_ids = validated_data.pop("specialization_ids", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save()

        if specialization_ids is not None:
            specs = Specialization.objects.filter(id__in=specialization_ids, active=True)
            instance.specializations.set(specs)

        return instance
