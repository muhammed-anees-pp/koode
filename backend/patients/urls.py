from django.urls import path
from .views import PatientProfileView, PatientTherapistListView, PatientTherapistDetailView

urlpatterns = [
    path("profile/", PatientProfileView.as_view()),
    path("therapists/", PatientTherapistListView.as_view()),
    path("therapists/<str:psychologist_id>/", PatientTherapistDetailView.as_view()),
]
