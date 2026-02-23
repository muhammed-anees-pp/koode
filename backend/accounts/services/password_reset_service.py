import secrets
from django.conf import settings
from rest_framework.exceptions import ValidationError
from accounts.models import User
from accounts.utils.redis_client import redis_client
from accounts.tasks import send_password_reset_email


RESET_TTL = 60 * 5

"""
ADMIN PASSWORD RESET SERVIECE
"""
class AdminPasswordResetService:
    # RESET REQUEST
    def request_reset(self, email):
        email = email.strip().lower()

        try:
            user = User.objects.get(email=email, role="ADMIN")
        except User.DoesNotExist:
            return
        
        pattern = "admin:password_reset:*"
        for key in redis_client.scan_iter(pattern):
            if redis_client.get(key) == user.email:
                redis_client.delete(key)

        token = secrets.token_urlsafe(48)
        redis_key = f"admin:password_reset:{token}"
        redis_client.setex(redis_key, RESET_TTL, user.email)
        reset_link = f"{settings.ADMIN_FRONTEND_URL}/reset-password?token={token}"
        send_password_reset_email.delay(user.email, reset_link)

    # PASSWORD RESET
    def reset_password(self, token, new_password):
        redis_key = f"admin:password_reset:{token}"
        email = redis_client.get(redis_key)

        if not email:
            raise ValidationError(
                {"token": "Invalid or expired reset token"}
            )

        try:
            user = User.objects.get(email=email, role="ADMIN")
        except User.DoesNotExist:
            raise ValidationError(
                {"token": "Invalid reset attempt"}
            )

        user.set_password(new_password)
        user.save()
        redis_client.delete(redis_key)


"""
PATIENT PASSWORD RESET SERVIECE
"""
class PatientPasswordResetService:
    # RESET REQUEST
    def request_reset(self, email):
        email = email.strip().lower()

        try:
            user = User.objects.get(email=email, role="PATIENT")
        except User.DoesNotExist:
            return
        
        pattern = "admin:password_reset:*"
        for key in redis_client.scan_iter(pattern):
            if redis_client.get(key) == user.email:
                redis_client.delete(key)

        token = secrets.token_urlsafe(48)
        redis_key = f"admin:password_reset:{token}"
        redis_client.setex(redis_key, RESET_TTL, user.email)
        reset_link = f"{settings.PATIENT_FRONTEND_URL}/reset-password?token={token}"
        send_password_reset_email.delay(user.email, reset_link)

    # PASSWORD RESET
    def reset_password(self, token, new_password):
        redis_key = f"admin:password_reset:{token}"
        email = redis_client.get(redis_key)

        if not email:
            raise ValidationError(
                {"token": "Invalid or expired reset token"}
            )

        try:
            user = User.objects.get(email=email, role="PATIENT")
        except User.DoesNotExist:
            raise ValidationError(
                {"token": "Invalid reset attempt"}
            )

        user.set_password(new_password)
        user.save()
        redis_client.delete(redis_key)