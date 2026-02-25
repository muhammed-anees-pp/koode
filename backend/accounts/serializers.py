from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError


############################
####        ADMIN       ####
############################
"""
ADMIN LOGIN SERIALIZER
"""
class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only = True,
        required = True,
        min_length = 8,
        trim_whitespace = False,
        error_messages = {
        "min_length": "Password must be at least 8 characters long"
        }
    )

    def validate(self, attrs):
        email = attrs.get("email").strip().lower()
        password = attrs.get("password")

        if not email or not password:
            raise serializers.ValidationError(
                _("Email and password are required."),
                code = "authorization"
            )
        
        user = authenticate(
            request = self.context.get("request"),
            username = email,
            password = password
        )

        if not user:
            raise serializers.ValidationError(
                _("Invalid email or password."),
                code = "authorization"
            )

        if not user.is_active:
            raise serializers.ValidationError(
                _("Account is disabled."),
                code = "authorization"
            )

        if user.role != "ADMIN":
            raise serializers.ValidationError(
                _("Only admin users can login here."),
                code = "authorization"
            )

        self.context["user"] = user
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh.access_token["role"] = user.role

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
    


############################
####       PATIENT      ####
############################
"""
PATIENT LOGIN SERIALIZER
"""
class PatientLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        from accounts.models import User as UserModel
        email = attrs.get("email").strip().lower()
        password = attrs.get("password")

        try:
            db_user = UserModel.objects.get(email=email, role="PATIENT")
            if not db_user.is_active:
                raise serializers.ValidationError(
                    {"code": "suspended", "detail": "Your account has been suspended. Please contact support."}
                )
        except UserModel.DoesNotExist:
            pass

        user = authenticate(request=self.context.get("request"), username=email, password=password)

        if not user:
            raise serializers.ValidationError("Invalid email or password")

        if user.role != "PATIENT":
            raise serializers.ValidationError("Invalid login portal")

        self.context["user"] = user
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh.access_token["role"] = user.role

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh)
        }
    



############################
####    PSYCHOLOGIST    ####
############################ 
"""
PSYCHOLOGIST LOGIN SERIALIZER
"""
class PsychologistLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email").strip().lower()
        password = attrs.get("password")

        user = authenticate(
            request=self.context.get("request"),
            username=email,
            password=password
        )

        if not user:
            raise serializers.ValidationError("Invalid email or password")

        if user.role != "PSYCHOLOGIST":
            raise serializers.ValidationError("Invalid login portal")

        if not user.is_active:
            raise serializers.ValidationError("Please verify your email first")

        self.context["user"] = user
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        refresh.access_token["role"] = user.role

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh)
        }



############################
####       COMMON       ####
############################
"""
SIGNUP SERIALIZER
"""
class SignupSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate_full_name(self, value):
        import re
        if not re.match(r"^[a-zA-Z\s]*$", value):
            raise serializers.ValidationError(
                "Full name can only contain English letters and spaces."
            )
        return value.strip()

    def validate_email(self, value):
        from accounts.models import User
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )
        return email

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match"}
            )

        try:
            validate_password(data["password"])
        except DjangoValidationError as e:
            raise serializers.ValidationError(
                {"password": list(e.messages)}
            )

        return data


"""
FORGOT PASSWORD SERIALIZER
"""
class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self,value):
        return value.strip().lower()


"""
RESET PASSWORD SERIALIZER
"""
class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.RegexField(
        r'^[A-Za-z0-9_\-]+$', error_messages={"invalid": "Invalid reset token format"}
    )
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match"}
            )

        try:
            validate_password(data["new_password"])
        except DjangoValidationError as e:
            raise serializers.ValidationError(
                {"new_password": list(e.messages)}
            )

        return data