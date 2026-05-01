from django.urls import path
from .views import (
    BookingListView, CancelBookingView, CreateAvailabilityView, CreateBookingView, PsychologistAvailabilityListView, PsychologistSlotListView, RescheduleBookingView, RevokeAvailabilitySlotView,
)

urlpatterns = [
    path("availability/create/", CreateAvailabilityView.as_view(), name="appointments-create-availability"),
    path("availability/me/", PsychologistAvailabilityListView.as_view(), name="appointments-my-availability"),
    path("availability/revoke-slot/", RevokeAvailabilitySlotView.as_view(), name="appointments-revoke-availability-slot"),
    path("slots/<str:psychologist_id>/", PsychologistSlotListView.as_view(), name="appointments-psychologist-slots"),
    path("book/", CreateBookingView.as_view(), name="appointments-create-booking"),
    path("bookings/", BookingListView.as_view(), name="appointments-bookings"),
    path("bookings/<uuid:booking_id>/cancel/", CancelBookingView.as_view(), name="appointments-cancel-booking"),
    path("bookings/<uuid:booking_id>/reschedule/", RescheduleBookingView.as_view(), name="appointments-reschedule-booking"),
]