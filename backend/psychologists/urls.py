from django.urls import path
from .views import PsychologistProfileView

urlpatterns = [
    path("profile/", PsychologistProfileView.as_view()),
]