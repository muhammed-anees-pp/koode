from django.urls import path
from .views import PsychologistPatientListView, PsychologistProfileView, SpecializationListView

urlpatterns = [
    path("specializations/", SpecializationListView.as_view()),
    path("profile/", PsychologistProfileView.as_view()),
    path("patients/", PsychologistPatientListView.as_view()),
]
