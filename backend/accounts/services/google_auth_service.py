from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings
from rest_framework.exceptions import ValidationError
from accounts.models import User
from patients.models import PatientProfile
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import transaction
import requests as http_requests


"""
GOOGLE AUTH SERVICE FOR PATIENT
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
            if not user.is_active:
                raise ValidationError({"code": "suspended", "detail": "Your account has been suspended. Please contact support."})

        # SIGNUP MODE
        elif mode == "signup":
            existing_user = User.objects.filter(email=email).first()

            if existing_user and existing_user.role != "PATIENT":
                raise ValidationError(
                    f"This email is already registered as {existing_user.role}."
                )

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


class GoogleOAuthCodeService:
    TOKEN_URL = "https://oauth2.googleapis.com/token"

    @staticmethod
    def exchange_code_for_idinfo(code, redirect_uri):
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise ValidationError("Google OAuth is not configured")

        try:
            response = http_requests.post(
                GoogleOAuthCodeService.TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                timeout=10,
            )
            response.raise_for_status()
            token_data = response.json()
            google_id_token = token_data.get("id_token")
            if not google_id_token:
                raise ValidationError("Google did not return an ID token")

            return id_token.verify_oauth2_token(
                google_id_token,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValidationError:
            raise
        except Exception:
            raise ValidationError("Google OAuth callback failed")
    

"""
GOOGLE AUTH SERVICE FOR PSYCHOLOGIST
"""
class GooglePsychologistAuthService:
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

        user = User.objects.filter(email=email, role="PSYCHOLOGIST").first()

        # LOGIN MODE
        if mode == "login":
            if not user:
                raise ValidationError({"email": "No psychologist account found. Please sign up."})

        # SIGNUP MODE
        elif mode == "signup":
            existing_user = User.objects.filter(email=email).first()

            if existing_user and existing_user.role != "PSYCHOLOGIST":
                raise ValidationError(
                    f"This email is already registered as {existing_user.role}."
                )

            if not user:
                user = User.objects.create_user(
                    email=email,
                    full_name=full_name,
                    password=None,
                    role="PSYCHOLOGIST",
                    is_active=True
                )

        else:
            raise ValidationError("Invalid mode")

        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh.access_token["role"] = user.role

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user
        }
