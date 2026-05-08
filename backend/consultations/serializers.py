from rest_framework import serializers
from consultations.models import ConsultationMessage


"""
CONSULTATION ROOM MESSAGE
"""
class ConsultationMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_role = serializers.CharField(source="sender.role", read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = ConsultationMessage
        fields = [
            "id",
            "sender",
            "sender_name",
            "sender_role",
            "text",
            "sent_at",
            "is_mine",
        ]
        read_only_fields = fields

    def get_is_mine(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.sender_id == request.user.id)
