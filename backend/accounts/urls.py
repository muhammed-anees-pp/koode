from django.urls import path
from .views import (AdminLoginView, RefreshTokenView, AdminLogoutView, AdminForgotPasswordView, AdminResetPasswordView,
                    PatientSignupView, PatientVerifyEmailView, PatientLoginView, PatientLogoutView,)

urlpatterns = [
    path("admin/auth/login/", AdminLoginView.as_view()),
    path("admin/auth/refresh/", RefreshTokenView.as_view()),
    path("admin/auth/logout/", AdminLogoutView.as_view()),
    path("admin/auth/forgot-password/", AdminForgotPasswordView.as_view()),
    path("admin/auth/reset-password/", AdminResetPasswordView.as_view()),
    path("patient/signup/", PatientSignupView.as_view()),
    path("patient/verify-email/", PatientVerifyEmailView.as_view()),
    path("patient/login/", PatientLoginView.as_view()),
    path("patient/logout/", PatientLogoutView.as_view()),
]