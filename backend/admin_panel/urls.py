from django.urls import path
from .views import AdminDashboardView, AdminPatientListView

urlpatterns = [
    path("dashboard/", AdminDashboardView.as_view()),
    path("patients/", AdminPatientListView.as_view()),
]
