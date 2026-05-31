from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.conf import settings
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core import signing
from django.shortcuts import redirect
from django.urls import reverse
from urllib.parse import urlencode
from .services.password_reset_service import ForgotPasswordResetService
from . throttles import ForgotPasswordThrottle
from .services.patient_auth_service import PatientAuthService
from .services.psychologist_auth_service import PsychologistAuthService
from . serializers import (AdminLoginSerializer, ForgotPasswordSerializer, ResetPasswordSerializer,
                           SignupSerializer, PatientLoginSerializer, PsychologistLoginSerializer)
from .services.google_auth_service import GoogleOAuthCodeService, GooglePatientAuthService, GooglePsychologistAuthService


REFRESH_COOKIE_BY_ROLE = {
    "ADMIN": "admin_refresh_token",
    "PATIENT": "patient_refresh_token",
    "PSYCHOLOGIST": "psychologist_refresh_token",
}


def get_refresh_cookie_name(role):
    return REFRESH_COOKIE_BY_ROLE.get(role)


def build_user_data(user, profile_picture_url=None):
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "profile_picture": profile_picture_url if profile_picture_url is not None else (user.profile_picture.url if user.profile_picture else None),
        "role": user.role,
    }


def set_refresh_cookie(response, role, refresh_token):
    cookie_name = get_refresh_cookie_name(role)
    if not cookie_name:
        return

    response.set_cookie(
        key=cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )
    response.delete_cookie("refresh_token", path="/")


def delete_refresh_cookie(response, role):
    cookie_name = get_refresh_cookie_name(role)
    if cookie_name:
        response.delete_cookie(cookie_name, path="/")
    response.delete_cookie("refresh_token", path="/")


GOOGLE_OAUTH_STATE_SALT = "accounts.google_oauth"


def get_google_oauth_redirect_uri(request):
    configured_uri = getattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", "")
    if configured_uri:
        return configured_uri
    return request.build_absolute_uri(reverse("google-oauth-callback"))


def get_frontend_oauth_callback_url(role):
    role_path = "psychologist" if role == "PSYCHOLOGIST" else "patient"
    if role == "PSYCHOLOGIST":
        frontend_url = (settings.PSYCHOLOGIST_FRONTEND_URL or "").rstrip("/")
    else:
        frontend_url = (settings.PATIENT_FRONTEND_URL or "").rstrip("/")

    if frontend_url.endswith(f"/{role_path}"):
        return f"{frontend_url}/oauth/callback"
    return f"{frontend_url}/{role_path}/oauth/callback"


def redirect_frontend_oauth_error(role, message):
    callback_url = get_frontend_oauth_callback_url(role)
    return redirect(f"{callback_url}?{urlencode({'error': message})}")


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

        user_data = build_user_data(user)

        response = Response(
            {"access": access, "user": user_data},
            status = status.HTTP_200_OK
        )

        set_refresh_cookie(response, user.role, refresh)

        return response



"""
REFRESH TOKEN
"""
class RefreshTokenView(APIView):
    def post(self, request):
        requested_role = request.data.get("role")
        cookie_name = get_refresh_cookie_name(requested_role)
        refresh_token = request.COOKIES.get(cookie_name) if cookie_name else None
        if not refresh_token:
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

            if requested_role and role != requested_role:
                return Response({"detail": "Invalid token for this role"}, status=401)

            user_id = refresh.get("user_id") or refresh.payload.get("user_id")
            user = None
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

            response_data = {"access": str(access)}
            if user:
                response_data["user"] = build_user_data(user)
                response_data["role"] = user.role

            response = Response(response_data)
            if role:
                set_refresh_cookie(response, role, refresh_token)
            return response
        except Exception:
            return Response({"detail": "Invalid token"}, status = 401)


class GoogleOAuthStartView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        role = request.query_params.get("role")
        mode = request.query_params.get("mode")

        if role not in {"PATIENT", "PSYCHOLOGIST"}:
            return Response({"detail": "Invalid role"}, status=status.HTTP_400_BAD_REQUEST)
        if mode not in {"login", "signup"}:
            return Response({"detail": "Invalid mode"}, status=status.HTTP_400_BAD_REQUEST)
        if not settings.GOOGLE_CLIENT_ID:
            return Response({"detail": "Google OAuth is not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        redirect_uri = get_google_oauth_redirect_uri(request)
        state = signing.dumps(
            {"role": role, "mode": mode, "redirect_uri": redirect_uri},
            salt=GOOGLE_OAUTH_STATE_SALT,
        )
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "prompt": "select_account",
        }

        return redirect(f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")


class GoogleOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")
        google_error = request.query_params.get("error")

        role = "PATIENT"

        try:
            if not state:
                return redirect_frontend_oauth_error(role, "Missing Google OAuth state")

            state_data = signing.loads(
                state,
                salt=GOOGLE_OAUTH_STATE_SALT,
                max_age=600,
            )
            role = state_data.get("role")
            mode = state_data.get("mode")
            redirect_uri = state_data.get("redirect_uri")

            if role not in {"PATIENT", "PSYCHOLOGIST"} or mode not in {"login", "signup"}:
                return redirect_frontend_oauth_error("PATIENT", "Invalid Google OAuth state")
            if google_error:
                return redirect_frontend_oauth_error(role, "Google sign-in was cancelled")
            if not code:
                return redirect_frontend_oauth_error(role, "Missing Google authorization code")

            idinfo = GoogleOAuthCodeService.exchange_code_for_idinfo(code, redirect_uri)
            if role == "PSYCHOLOGIST":
                result = GooglePsychologistAuthService.authenticate_or_create(idinfo, mode)
            else:
                result = GooglePatientAuthService.authenticate_or_create(idinfo, mode)

            user = result["user"]
            callback_url = get_frontend_oauth_callback_url(user.role)
            response = redirect(callback_url)
            set_refresh_cookie(response, user.role, result["refresh"])
            return response
        except Exception as exc:
            detail = getattr(exc, "detail", None)
            if isinstance(detail, dict):
                message = next(iter(detail.values()), "Google sign-in failed")
            elif isinstance(detail, list) and detail:
                message = str(detail[0])
            elif detail:
                message = str(detail)
            else:
                message = "Google sign-in failed"
            return redirect_frontend_oauth_error(role, message)



"""
ADMIN LOGOUT VIEW
"""
class AdminLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get(get_refresh_cookie_name("ADMIN")) or request.COOKIES.get("refresh_token")

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

        delete_refresh_cookie(response, "ADMIN")

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

        user_data = build_user_data(user)

        response = Response(
            {"access": data["access"], "user": user_data},
            status=status.HTTP_200_OK
        )

        set_refresh_cookie(response, user.role, data["refresh"])

        return response
    

"""
PATIENT LOGOUT VIEW
"""
class PatientLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get(get_refresh_cookie_name("PATIENT")) or request.COOKIES.get("refresh_token")

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

        delete_refresh_cookie(response, "PATIENT")

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
                "user": build_user_data(user)
            },
            status=status.HTTP_200_OK
        )

        set_refresh_cookie(response, user.role, result["refresh"])

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

        user_data = build_user_data(user, profile_pic_url)

        response = Response(
            {"access": data["access"], "user": user_data},
            status=status.HTTP_200_OK
        )

        set_refresh_cookie(response, user.role, data["refresh"])

        return response


"""
PSYCHOLOGIST LOGOUT VIEW
"""
class PsychologistLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get(get_refresh_cookie_name("PSYCHOLOGIST")) or request.COOKIES.get("refresh_token")

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

        delete_refresh_cookie(response, "PSYCHOLOGIST")
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
                "user": build_user_data(user)
            },
            status=status.HTTP_200_OK
        )

        set_refresh_cookie(response, user.role, result["refresh"])

        return response
