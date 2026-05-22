from django.urls import path
from consultations.views import (
    ConsultationApproveJoinView, ConsultationDetailView, ConsultationExitView, ConsultationMessageListCreateView,
    ConsultationNotesView, ConsultationPatientRequestJoinView, ConsultationPsychologistEnterView, ConsultationTokenView,
)


urlpatterns = [
    path("bookings/<uuid:booking_id>/", ConsultationDetailView.as_view(), name="consultation-detail"),
    path("bookings/<uuid:booking_id>/token/", ConsultationTokenView.as_view(), name="consultation-token"),
    path("bookings/<uuid:booking_id>/psychologist-enter/", ConsultationPsychologistEnterView.as_view(), name="consultation-psychologist-enter"),
    path("bookings/<uuid:booking_id>/request-join/", ConsultationPatientRequestJoinView.as_view(), name="consultation-request-join"),
    path("bookings/<uuid:booking_id>/approve-join/", ConsultationApproveJoinView.as_view(), name="consultation-approve-join"),
    path("bookings/<uuid:booking_id>/exit/", ConsultationExitView.as_view(), name="consultation-exit"),
    path("bookings/<uuid:booking_id>/messages/", ConsultationMessageListCreateView.as_view(), name="consultation-messages"),
    path("bookings/<uuid:booking_id>/notes/", ConsultationNotesView.as_view(), name="consultation-notes"),
]
