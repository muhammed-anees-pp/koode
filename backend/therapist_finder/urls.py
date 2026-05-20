from django.urls import path
from .views import TherapistFinderQuestionsView, TherapistFinderRecommendationView


urlpatterns = [
    path("questions/", TherapistFinderQuestionsView.as_view()),
    path("recommend/", TherapistFinderRecommendationView.as_view()),
]
