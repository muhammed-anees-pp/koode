from django.urls import path
from .views import AdminLoginView, RefreshTokenView, AdminLogoutView

urlpatterns = [
    path("admin/auth/login/", AdminLoginView.as_view()),
    path("admin/auth/refresh/", RefreshTokenView.as_view()),
    path("admin/auth/logout/", AdminLogoutView.as_view()),
]
