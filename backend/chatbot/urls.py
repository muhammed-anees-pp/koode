from django.urls import path
from .views import ChatbotMessageView


urlpatterns = [
    path("messages/", ChatbotMessageView.as_view(), name="chatbot-messages"),
]
