from django.urls import path
from .views import AdminDashboardView, AdminPatientListView, AdminPatientSuspendView, AdminPsychologistListView, AdminPsychologistSuspendView

urlpatterns = [
    path("dashboard/", AdminDashboardView.as_view()),
    path("patients/", AdminPatientListView.as_view()),
    path("patients/<str:patient_id>/suspend/", AdminPatientSuspendView.as_view()),
    path("psychologist/", AdminPsychologistListView.as_view()),
    path("psychologist/<str:psychologist_id>/suspend/", AdminPsychologistSuspendView.as_view()),
]
