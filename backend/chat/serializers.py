from rest_framework import serializers

from chat.models import ChatRoom, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_role = serializers.CharField(source="sender.role", read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "room",
            "sender",
            "sender_name",
            "sender_role",
            "content",
            "is_read",
            "read_at",
            "created_at",
            "is_mine",
        ]
        read_only_fields = fields

    def get_is_mine(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.sender_id == request.user.id)


class ChatRoomSerializer(serializers.ModelSerializer):
    appointment_id = serializers.UUIDField(source="appointment.id", read_only=True)
    patient_name = serializers.CharField(source="patient.user.full_name", read_only=True)
    psychologist_name = serializers.CharField(source="psychologist.user.full_name", read_only=True)
    appointment_status = serializers.CharField(source="appointment.status", read_only=True)
    appointment_date = serializers.DateField(source="appointment.date", read_only=True)
    appointment_start_time = serializers.TimeField(source="appointment.start_time", read_only=True)
    appointment_end_time = serializers.TimeField(source="appointment.end_time", read_only=True)
    last_message = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "appointment_id",
            "patient_name",
            "psychologist_name",
            "appointment_status",
            "appointment_date",
            "appointment_start_time",
            "appointment_end_time",
            "is_active",
            "last_message",
            "last_message_at",
            "unread_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_last_message(self, obj):
        message = getattr(obj, "last_message_obj", None)
        if not message:
            message = obj.messages.order_by("-created_at").first()
        return message.content if message else ""

    def get_last_message_at(self, obj):
        message = getattr(obj, "last_message_obj", None)
        if not message:
            message = obj.messages.order_by("-created_at").first()
        return message.created_at if message else None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
