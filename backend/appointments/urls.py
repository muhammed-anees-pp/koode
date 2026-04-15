from django.urls import path
from .views import (
    CreateAvailabilityView, PsychologistAvailabilityListView, PsychologistSlotListView,
)

urlpatterns = [
    path("availability/create/", CreateAvailabilityView.as_view()),
    path("availability/me/", PsychologistAvailabilityListView.as_view()),
    path("slots/<str:psychologist_id>/", PsychologistSlotListView.as_view()),
]