from django.urls import path
from reviews.views import AdminReviewListView, BookingReviewView, PsychologistReviewDashboardView


urlpatterns = [
    path("admin/", AdminReviewListView.as_view(), name="admin-review-list"),
    path("psychologist/dashboard/", PsychologistReviewDashboardView.as_view(), name="psychologist-review-dashboard"),
    path("bookings/<str:booking_id>/", BookingReviewView.as_view(), name="booking-review"),
]
