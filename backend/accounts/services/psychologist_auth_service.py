import secrets
from django.conf import settings
from rest_framework.exceptions import ValidationError
from accounts.utils.redis_client import redis_client
from accounts.repositories.psychologist_repository import PsychologistRepository
from accounts.tasks import (send_psychologist_verification_email, delete_unverified_psychologist)

VERIFY_TTL = 60 * 10


"""
PSYCHOLOGIST AUTHENTICATION SERVICE
"""
class PsychologistAuthService:
    # SIGNUP
    def signup(self, validated_data):
        email = validated_data["email"].strip().lower()
        existing = PsychologistRepository.get_by_email(email)
        if existing:
            raise ValidationError({"email": "Email already registered."})

        user = PsychologistRepository.create_psychologist({
            "email": email,
            "full_name": validated_data["full_name"],
            "password": validated_data["password"],
        })

        delete_unverified_psychologist.apply_async(
            args=[str(user.id)],
            countdown=600
        )

        self._send_verification_email(user.email)
        return user

    # SEND VERIFICATION
    def _send_verification_email(self, email):
        token = secrets.token_urlsafe(48)
        redis_key = f"psychologist:verify:{token}"
        redis_client.setex(redis_key, VERIFY_TTL, email)
        verify_link = (
            f"{settings.PSYCHOLOGIST_FRONTEND_URL}/verify-email?token={token}"
        )

        send_psychologist_verification_email.delay(email, verify_link)

    # EMAIL VERIFYING
    def verify_email(self, token):
        redis_key = f"psychologist:verify:{token}"
        email = redis_client.get(redis_key)

        if not email:
            raise ValidationError({"token": "Invalid or expired token"})

        if isinstance(email, bytes):
            email = email.decode()

        user = PsychologistRepository.get_by_email(email)

        if not user:
            raise ValidationError({"token": "Invalid verification attempt"})

        user.is_active = True
        user.save()
        redis_client.delete(redis_key)
        return True