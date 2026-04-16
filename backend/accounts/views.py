from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.conf import settings
from rest_framework.permissions import IsAuthenticated, AllowAny
from .services.password_reset_service import ForgotPasswordResetService
from . throttles import ForgotPasswordThrottle
from .services.patient_auth_service import PatientAuthService
from .services.psychologist_auth_service import PsychologistAuthService
from . serializers import (AdminLoginSerializer, ForgotPasswordSerializer, ResetPasswordSerializer,
                           SignupSerializer, PatientLoginSerializer, PsychologistLoginSerializer)
from .services.google_auth_service import GooglePatientAuthService, GooglePsychologistAuthService


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
        user = serializer.context.get("user")
        access = data["access"]
        refresh = data["refresh"]

        user_data = {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "profile_picture": user.profile_picture.url if user.profile_picture else None,
            "role": user.role
        }

        response = Response(
            {"access": access, "user": user_data},
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
            from accounts.models import User
            refresh = RefreshToken(refresh_token)
            access = refresh.access_token
            role = refresh.get("role")
            if role:
                access["role"] = role

            user_id = refresh.get("user_id") or refresh.payload.get("user_id")
            if user_id:
                try:
                    user = User.objects.get(pk=user_id)
                    if not user.is_active:
                        return Response(
                            {"code": "suspended", "detail": "Your account has been suspended."},
                            status=401
                        )
                except User.DoesNotExist:
                    return Response({"detail": "Invalid token"}, status=401)

            return Response({"access": str(access)})
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
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ForgotPasswordResetService(role="ADMIN").request_reset(
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
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ForgotPasswordResetService(role="ADMIN").reset_password(
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
        serializer = SignupSerializer(data=request.data)
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
        user = serializer.context.get("user")

        user_data = {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "profile_picture": user.profile_picture.url if user.profile_picture else None,
            "role": user.role
        }

        response = Response(
            {"access": data["access"], "user": user_data},
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
    
"""
PATIENT FORGOT PASSWORD VIEW
"""
class PatientForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ForgotPasswordThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ForgotPasswordResetService(role="PATIENT").request_reset(
            serializer.validated_data["email"]
        )

        return Response(
            {"message": "If the email exists, a reset link has been sent to"},
            status=status.HTTP_200_OK,
        )


"""
PATIENT RESET PASSWORD VIEW
"""
class PatientResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ForgotPasswordResetService(role="PATIENT").reset_password(
            token=serializer.validated_data["token"],
            new_password=serializer.validated_data["new_password"],
        )

        return Response(
            {"message": "Password reset successful"},
            status=status.HTTP_200_OK,
        )
    

"""
GOOGLE SIGN UP AND LOGIN FOR PATIENT
"""
class PatientGoogleAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        mode = request.data.get("mode")

        if not token or not mode:
            return Response({"detail": "Token and mode required"}, status=400)

        idinfo = GooglePatientAuthService.verify_google_token(token)
        result = GooglePatientAuthService.authenticate_or_create(idinfo, mode)
        user = result["user"]
        response = Response(
            {
                "access": result["access"],
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "profile_picture": user.profile_picture.url if user.profile_picture else None,
                    "role": user.role,
                }
            },
            status=status.HTTP_200_OK
        )

        response.set_cookie(
            key="refresh_token",
            value=result["refresh"],
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path="/",
        )

        return response
    


############################
####    PSYCHOLOGIST    ####
############################
"""
PSYCHOLOGIST SIGNUP VIEW
"""
class PsychologistSignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        PsychologistAuthService().signup(serializer.validated_data)

        return Response(
            {"message": "Signup successful. Please verify your email."},
            status=status.HTTP_201_CREATED
        )


"""
PSYCHOLOGIST ACCOUNT VERIFICATION VIEW
"""
class PsychologistVerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")

        if not token:
            return Response(
                {"detail": "Token is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        PsychologistAuthService().verify_email(token)

        return Response(
            {"message": "Email verified successfully"},
            status=status.HTTP_200_OK
        )
    
"""
PSYCHOLOGIST LOGIN VIEW
"""
class PsychologistLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PsychologistLoginSerializer(
            data=request.data,
            context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = serializer.context.get("user")
        profile_pic_url = None
        if user.profile_picture:
            profile_pic_url = user.profile_picture.url
        else:
            try:
                app = user.psychologist_application
                if app and app.profile_picture:
                    profile_pic_url = app.profile_picture.url
            except Exception:
                pass

        user_data = {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "profile_picture": profile_pic_url,
            "role": user.role
        }

        response = Response(
            {"access": data["access"], "user": user_data},
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
PSYCHOLOGIST LOGOUT VIEW
"""
class PsychologistLogoutView(APIView):
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
PSYCHOLOGIST FORGOT PASSWORD VIEW
"""
class PsycologistForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ForgotPasswordThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ForgotPasswordResetService(role="PSYCHOLOGIST").request_reset(
            serializer.validated_data["email"]
        )

        return Response(
            {"message": "If the email exists, a reset link has been sent to"},
            status=status.HTTP_200_OK,
        )


"""
PSYCHOLOGIST RESET PASSWORD VIEW
"""
class PsychologistResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ForgotPasswordResetService(role="PSYCHOLOGIST").reset_password(
            token=serializer.validated_data["token"],
            new_password=serializer.validated_data["new_password"],
        )

        return Response(
            {"message": "Password reset successful"},
            status=status.HTTP_200_OK,
        )
    

"""
GOOGLE SIGN UP AND LOGIN FOR PSYCHOLOGIST
"""
class PsychologistGoogleAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        mode = request.data.get("mode")

        if not token or not mode:
            return Response({"detail": "Token and mode required"}, status=400)

        idinfo = GooglePsychologistAuthService.verify_google_token(token)
        result = GooglePsychologistAuthService.authenticate_or_create(idinfo, mode)
        user = result["user"]

        response = Response(
            {
                "access": result["access"],
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "profile_picture": user.profile_picture.url if user.profile_picture else None,
                    "role": user.role,
                }
            },
            status=status.HTTP_200_OK
        )

        response.set_cookie(
            key="refresh_token",
            value=result["refresh"],
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path="/",
        )

        return response
