from django.urls import path
from .views import AdminDashboardView, AdminPatientListView, AdminPatientSuspendView

urlpatterns = [
    path("dashboard/", AdminDashboardView.as_view()),
    path("patients/", AdminPatientListView.as_view()),
    path("patients/<str:patient_id>/suspend/", AdminPatientSuspendView.as_view()),
]
