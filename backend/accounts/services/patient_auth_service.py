import secrets
from django.conf import settings
from rest_framework.exceptions import ValidationError
from accounts.utils.redis_client import redis_client
from accounts.repositories.patient_repository import PatientRepository
from accounts.tasks import (send_patient_verification_email,delete_unverified_patient)

VERIFY_TTL = 60 * 10


"""
PATIENT AUTHENTICATION SERVICE
"""
class PatientAuthService:
    # SIGNUP
    def signup(self, validated_data):
        email = validated_data["email"].strip().lower()
        existing = PatientRepository.get_by_email(email)
        if existing:
            raise ValidationError({"email": "Email already registered."})

        user = PatientRepository.create_patient_with_profile({
            "email": email,
            "full_name": validated_data["full_name"],
            "password": validated_data["password"],
        })

        delete_unverified_patient.apply_async(
            args=[str(user.id)],
            countdown=600
        )

        self._send_verification_email(user.email)
        return user

    # SEND VERIFICATION
    def _send_verification_email(self, email):
        token = secrets.token_urlsafe(48)
        redis_key = f"patient:verify:{token}"
        redis_client.setex(redis_key, VERIFY_TTL, email)
        verify_link = (
            f"{settings.PATIENT_FRONTEND_URL}/verify-email?token={token}"
        )

        send_patient_verification_email.delay(email, verify_link)

    # EMAIL VERIFYING
    def verify_email(self, token):
        redis_key = f"patient:verify:{token}"
        email = redis_client.get(redis_key)

        if not email:
            raise ValidationError({"token": "Invalid or expired token"})

        if isinstance(email, bytes):
            email = email.decode()

        user = PatientRepository.get_by_email(email)

        if not user:
            raise ValidationError({"token": "Invalid verification attempt"})

        user.is_active = True
        user.save()
        profile = user.patient_profile
        profile.is_email_verified = True
        profile.save()
        redis_client.delete(redis_key)
        return True