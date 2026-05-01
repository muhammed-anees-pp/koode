from django.urls import path

from chat.views import (
    AppointmentChatFileUploadView,
    AppointmentChatMessageListView,
    AppointmentChatRoomView,
    ChatRoomListView,
)


urlpatterns = [
    path("rooms/", ChatRoomListView.as_view()),
    path("appointments/<uuid:appointment_id>/", AppointmentChatRoomView.as_view()),
    path("appointments/<uuid:appointment_id>/messages/", AppointmentChatMessageListView.as_view()),
    path("appointments/<uuid:appointment_id>/messages/files/", AppointmentChatFileUploadView.as_view()),
]
