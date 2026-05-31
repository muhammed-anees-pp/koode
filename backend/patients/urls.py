from django.urls import path
from .views import PatientProfileView, PatientPsychologistListView, PatientPsychologistDetailView

urlpatterns = [
    path("profile/", PatientProfileView.as_view()),
    path("psychologists/", PatientPsychologistListView.as_view()),
    path("psychologists/<str:psychologist_id>/", PatientPsychologistDetailView.as_view()),
]
