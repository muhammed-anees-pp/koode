from rest_framework import serializers
from .models import Interview


"""
INTERVIEW SERIALIZER
"""
class InterviewSerializer(serializers.ModelSerializer):
    interview_date = serializers.DateTimeField(source="scheduled_at", read_only=True)
    applicant_name = serializers.CharField(source="application.user.full_name", read_only=True)
    applicant_email = serializers.EmailField(source="application.user.email", read_only=True)
    application_id = serializers.UUIDField(source="application.id", read_only=True)

    class Meta:
        model = Interview
        fields = [
            "id", "application_id", "applicant_name", "applicant_email", "interview_date", "scheduled_at", "room_id", "status", "admin_joined", "psychologist_joined", "join_requested", "created_at",
        ]
    