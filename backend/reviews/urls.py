from django.urls import path
from reviews.views import BookingReviewView, PsychologistReviewDashboardView


urlpatterns = [
    path("psychologist/dashboard/", PsychologistReviewDashboardView.as_view(), name="psychologist-review-dashboard"),
    path("bookings/<uuid:booking_id>/", BookingReviewView.as_view(), name="booking-review"),
]
