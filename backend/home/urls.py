from django.urls import path
from . import views

urlpatterns = [
    path('api/status/', views.api_status, name='api_status'),
]
