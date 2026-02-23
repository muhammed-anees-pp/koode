from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings
from rest_framework.exceptions import ValidationError
from accounts.models import User
from patients.models import PatientProfile
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import transaction


"""
GOOGLE AUTH SERVICE
"""
class GooglePatientAuthService:
    @staticmethod
    def verify_google_token(token):
        try:
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            if idinfo["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
                raise ValidationError("Invalid token issuer")

            return idinfo

        except Exception:
            raise ValidationError("Invalid or expired Google token")

    @staticmethod
    @transaction.atomic
    def authenticate_or_create(idinfo, mode):
        email = idinfo.get("email")
        full_name = idinfo.get("name")

        if not email:
            raise ValidationError("Google account has no email")

        user = User.objects.filter(email=email, role="PATIENT").first()

        # LOGIN MODE
        if mode == "login":
            if not user:
                raise ValidationError({"email": "No account found. Please sign up."})

        # SIGNUP MODE
        elif mode == "signup":
            if not user:
                user = User.objects.create_user(
                    email=email,
                    full_name=full_name,
                    password=None,
                    role="PATIENT",
                    is_active=True
                )

                PatientProfile.objects.create(user=user)

        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh.access_token["role"] = user.role

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user
        }