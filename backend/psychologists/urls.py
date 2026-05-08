from django.urls import path
from .views import PsychologistPatientListView, PsychologistProfileView

urlpatterns = [
    path("profile/", PsychologistProfileView.as_view()),
    path("patients/", PsychologistPatientListView.as_view()),
]
