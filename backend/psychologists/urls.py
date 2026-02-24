from django.urls import path
from .views import ApplicationView

urlpatterns = [
    path("", ApplicationView.as_view()),
]