from django.urls import path
from .views import AdminLoginView, RefreshTokenView, AdminLogoutView, AdminForgotPasswordView, AdminResetPasswordView

urlpatterns = [
    path("admin/auth/login/", AdminLoginView.as_view()),
    path("admin/auth/refresh/", RefreshTokenView.as_view()),
    path("admin/auth/logout/", AdminLogoutView.as_view()),
    path("admin/auth/forgot-password/", AdminForgotPasswordView.as_view()),
    path("admin/auth/reset-password/", AdminResetPasswordView.as_view()),
]
