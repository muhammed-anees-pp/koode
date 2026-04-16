from rest_framework import serializers
from .models import Notification


"""
NOTIFICATION SERIALIZER
"""
class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "message", "is_read", "created_at"]
        read_only_fields = fields

