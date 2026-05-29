from django.urls import path
from .views import AdminDashboardExportView, AdminDashboardView, AdminPatientListView, AdminPatientDetailView, AdminPatientSuspendView, AdminPsychologistListView, AdminPsychologistSuspendView, AdminPsychologistDetailView

urlpatterns = [
    path("dashboard/", AdminDashboardView.as_view()),
    path("dashboard/export/", AdminDashboardExportView.as_view()),
    path("patients/", AdminPatientListView.as_view()),
    path("patients/<str:patient_id>/", AdminPatientDetailView.as_view()),
    path("patients/<str:patient_id>/suspend/", AdminPatientSuspendView.as_view()),
    path("psychologist/", AdminPsychologistListView.as_view()),
    path("psychologist/<str:psychologist_id>/", AdminPsychologistDetailView.as_view()),
    path("psychologist/<str:psychologist_id>/suspend/", AdminPsychologistSuspendView.as_view()),
]
