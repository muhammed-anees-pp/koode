from django.urls import re_path

from chat.consumers import AppointmentChatConsumer


websocket_urlpatterns = [
    re_path(r"ws/chat/(?P<appointment_id>[^/]+)/$", AppointmentChatConsumer.as_asgi()),
]
