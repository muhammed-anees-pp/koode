from django.urls import path
from .views import (
    BookingListView, CancelBookingView, CreateAvailabilityView, CreateBookingView, PsychologistAvailabilityListView, PsychologistSlotListView, RescheduleBookingView,
)

urlpatterns = [
    path("availability/create/", CreateAvailabilityView.as_view()),
    path("availability/me/", PsychologistAvailabilityListView.as_view()),
    path("slots/<str:psychologist_id>/", PsychologistSlotListView.as_view()),
    path("book/", CreateBookingView.as_view()),
    path("bookings/", BookingListView.as_view()),
    path("bookings/<uuid:booking_id>/cancel/", CancelBookingView.as_view()),
    path("bookings/<uuid:booking_id>/reschedule/", RescheduleBookingView.as_view()),
]
