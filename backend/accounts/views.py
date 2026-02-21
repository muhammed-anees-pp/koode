from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.conf import settings
from rest_framework.permissions import IsAuthenticated, AllowAny
from .services.password_reset_service import AdminPasswordResetService
from . throttles import ForgotPasswordThrottle
from .services.patient_auth_service import PatientAuthService
from . serializers import (AdminLoginSerializer, AdminForgotPasswordSerializer, AdminResetPasswordSerializer,
                           PatientSignupSerializer, PatientLoginSerializer)



############################
####        ADMIN       ####
############################
"""
ADMIN LOGIN VIEW
"""
class AdminLoginView(APIView):
    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception = True)
        data = serializer.validated_data
        access = data["access"]
        refresh = data["refresh"]

        response = Response(
            {"access": access},
            status = status.HTTP_200_OK
        )

        response.set_cookie(
            key = "refresh_token",
            value = refresh,
            httponly = True,
            secure = settings.COOKIE_SECURE,
            samesite = settings.COOKIE_SAMESITE,
            path = "/",
        )

        return response



"""
REFRESH TOKEN
"""
class RefreshTokenView(APIView):
    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response({"detail": "No refresh token"}, status = 401)

        try:
            refresh = RefreshToken(refresh_token)
            access = str(refresh.access_token)

            return Response({"access": access})
        except Exception:
            return Response({"detail": "Invalid token"}, status = 401)



"""
ADMIN LOGOUT VIEW
"""
class AdminLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass

        response = Response(
            {"detail": "Logged out successfully"},
            status=status.HTTP_200_OK
        )

        response.delete_cookie("refresh_token")

        return response



"""
ADMIN FORGOT PASSWORD VIEW
"""
class AdminForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ForgotPasswordThrottle]

    def post(self, request):
        serializer = AdminForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        AdminPasswordResetService().request_reset(
            serializer.validated_data["email"]
        )

        return Response(
            {"message": "If the email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )

"""
ADMIN RESET PASSWORD VIEW
"""
class AdminResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AdminResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        AdminPasswordResetService().reset_password(
            token=serializer.validated_data["token"],
            new_password=serializer.validated_data["new_password"],
        )

        return Response(
            {"message": "Password reset successful"},
            status=status.HTTP_200_OK,
        )





############################
####       PATIENT      ####
############################
"""
PATIENT SIGNUP VIEW
"""
class PatientSignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PatientSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        PatientAuthService().signup(serializer.validated_data)

        return Response(
            {"message": "Signup successful. Please verify your email."},
            status=status.HTTP_201_CREATED
        )


"""
PATIENT ACCOUNT VERIFICATION VIEW
"""
class PatientVerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")

        PatientAuthService().verify_email(token)

        return Response(
            {"message": "Email verified successfully"},
            status=status.HTTP_200_OK
        )


"""
PATIENT LOGIN VIEW
"""
class PatientLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PatientLoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        response = Response(
            {"access": data["access"]},
            status=status.HTTP_200_OK
        )

        response.set_cookie(
            key="refresh_token",
            value=data["refresh"],
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path="/",
        )

        return response
    

"""
PATIENT LOGOUT VIEW
"""
class PatientLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass

        response = Response(
            {"detail": "Logged out successfully"},
            status=status.HTTP_200_OK
        )

        response.delete_cookie("refresh_token")

        return response