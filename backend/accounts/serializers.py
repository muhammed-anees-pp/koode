from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.translation import gettext_lazy as _


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

    # VALIDATIONS FOR ADMIN LOGIN
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

        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }