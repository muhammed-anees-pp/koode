from django.urls import path
from reviews.views import BookingReviewView


urlpatterns = [
    path("bookings/<uuid:booking_id>/", BookingReviewView.as_view(), name="booking-review"),
]
