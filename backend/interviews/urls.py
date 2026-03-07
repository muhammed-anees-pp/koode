from django.urls import path
from .views import (
    InterviewDetailView, PsychologistInterviewView, PsychologistInterviewTokenView, AdminInterviewTokenView, UpdateInterviewStatusView, JoinRequestView,
    PsychologistJoinStatusView, AdminPendingJoinView, ApproveJoinView, EndInterviewView, ChatMessageListView, ChatMessageCreateView,
)

urlpatterns = [
    path("my/", PsychologistInterviewView.as_view()),
    path("<uuid:interview_id>/", InterviewDetailView.as_view()),
    path("<uuid:interview_id>/token/", PsychologistInterviewTokenView.as_view()),
    path("<uuid:interview_id>/admin-token/", AdminInterviewTokenView.as_view()),
    path("<uuid:interview_id>/status/", UpdateInterviewStatusView.as_view()),
    path("<uuid:interview_id>/join-request/", JoinRequestView.as_view()),
    path("<uuid:interview_id>/join-status/", PsychologistJoinStatusView.as_view()),
    path("<uuid:interview_id>/pending-join/", AdminPendingJoinView.as_view()),
    path("<uuid:interview_id>/approve-join/", ApproveJoinView.as_view()),
    path("<uuid:interview_id>/end/", EndInterviewView.as_view()),
    path("<uuid:interview_id>/chat/", ChatMessageListView.as_view()),
    path("<uuid:interview_id>/chat/send/", ChatMessageCreateView.as_view()),
]