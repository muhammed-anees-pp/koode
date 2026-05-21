from django.urls import path
from complaints.views import (
    BookingComplaintCreateView, EligibleComplaintBookingListView, PatientComplaintDetailView, PatientComplaintListView,
)


urlpatterns = [
    path("", PatientComplaintListView.as_view(), name="patient-complaints"),
    path("eligible-bookings/", EligibleComplaintBookingListView.as_view(), name="eligible-complaint-bookings"),
    path("<uuid:complaint_id>/", PatientComplaintDetailView.as_view(), name="patient-complaint-detail"),
    path("bookings/<uuid:booking_id>/", BookingComplaintCreateView.as_view(), name="booking-complaint-create"),
]
