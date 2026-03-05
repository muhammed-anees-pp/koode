from django.urls import path
from .views import (SubmitApplicationView, MyApplicationView, ApplicationStatusView)

urlpatterns = [
    path("submit/", SubmitApplicationView.as_view()),
    path("my/", MyApplicationView.as_view()),
    path("status/", ApplicationStatusView.as_view()),
]