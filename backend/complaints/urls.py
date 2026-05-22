from django.urls import path
from complaints.views import (
    AdminComplaintDetailView, AdminComplaintListView, BookingComplaintCreateView, EligibleComplaintBookingListView,
    PatientComplaintDetailView, PatientComplaintListView, PsychologistComplaintDetailView, PsychologistComplaintListView,
)


urlpatterns = [
    path("", PatientComplaintListView.as_view(), name="patient-complaints"),
    path("eligible-bookings/", EligibleComplaintBookingListView.as_view(), name="eligible-complaint-bookings"),
    path("<uuid:complaint_id>/", PatientComplaintDetailView.as_view(), name="patient-complaint-detail"),
    path("bookings/<uuid:booking_id>/", BookingComplaintCreateView.as_view(), name="booking-complaint-create"),
    path("admin/", AdminComplaintListView.as_view(), name="admin-complaints"),
    path("admin/<uuid:complaint_id>/", AdminComplaintDetailView.as_view(), name="admin-complaint-detail"),
    path("psychologist/", PsychologistComplaintListView.as_view(), name="psychologist-complaints"),
    path("psychologist/<uuid:complaint_id>/", PsychologistComplaintDetailView.as_view(), name="psychologist-complaint-detail"),
]
