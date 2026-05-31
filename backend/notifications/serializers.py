from rest_framework import serializers
from .models import Notification


"""
NOTIFICATION SERIALIZER
"""
class NotificationSerializer(serializers.ModelSerializer):
    recipient = serializers.UUIDField(source="recipient_id", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "recipient", "message", "target_url", "is_read", "created_at"]
        read_only_fields = fields
