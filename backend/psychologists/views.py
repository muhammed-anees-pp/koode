from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


"""
LIST ACTIVE SPECIALIZATIONS
"""
class SpecializationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import Specialization
        specializations = Specialization.objects.filter(active=True).order_by("name")
        data = [{"id": s.id, "name": s.name} for s in specializations]
        return Response(data)