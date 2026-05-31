from django.urls import path
from .views import PsychologistFinderQuestionsView, PsychologistFinderRecommendationView


urlpatterns = [
    path("questions/", PsychologistFinderQuestionsView.as_view()),
    path("recommend/", PsychologistFinderRecommendationView.as_view()),
]
