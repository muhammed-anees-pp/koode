from django.urls import path
from .views import (SubmitApplicationView, MyApplicationView, ApplicationStatusView, AdminApplicationListView, AdminApplicationDetailView,)

urlpatterns = [
    path("submit/", SubmitApplicationView.as_view()),
    path("my/", MyApplicationView.as_view()),
    path("status/", ApplicationStatusView.as_view()),
    path("admin/application-list/", AdminApplicationListView.as_view()),
    path("admin/application/<uuid:pk>/", AdminApplicationDetailView.as_view()),
]