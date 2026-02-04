from django.shortcuts import render
from django.http import JsonResponse

# Create your views here.
def api_status(request):
    return JsonResponse({"status": "online", "message": "Backend connected successfully"})
