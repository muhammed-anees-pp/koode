import json
import logging

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework.renderers import JSONRenderer

from appointments.models import Booking
from chat.models import ChatRoom, Message
from chat.serializers import MessageSerializer
from chat.services.chat_service import ensure_chat_room_for_booking
from notifications.services import create_notification


logger = logging.getLogger(__name__)


class AppointmentChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.appointment_id = self.scope["url_route"]["kwargs"]["appointment_id"]
        self.group_name = f"chat_{self.appointment_id}"
        self.user = self.scope.get("user")

        room = await self.get_room()
        if not room:
            await self.close(code=4403)
            return

        self.room_id = room["id"]
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "presence.message",
                "event": "online",
                "user_id": str(self.user.id),
                "user_name": self.user.full_name,
            },
        )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "presence.message",
                    "event": "offline",
                    "user_id": str(getattr(self.user, "id", "")),
                    "user_name": getattr(self.user, "full_name", ""),
                },
            )
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send_error("Invalid message payload.")
            return

        message_type = payload.get("type", "message")
        if message_type == "typing":
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "typing.message",
                    "user_id": str(self.user.id),
                    "user_name": self.user.full_name,
                    "is_typing": bool(payload.get("is_typing")),
                },
            )
            return

        content = (payload.get("content") or "").strip()
        if not content:
            await self.send_error("Message cannot be empty.")
            return

        message = await self.create_message(content)
        if not message:
            await self.send_error("Chat is not active for this appointment.")
            return

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "message": message,
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "message",
            "message": event["message"],
        }))

    async def typing_message(self, event):
        if event["user_id"] == str(self.user.id):
            return
        await self.send(text_data=json.dumps({
            "type": "typing",
            "user_id": event["user_id"],
            "user_name": event["user_name"],
            "is_typing": event["is_typing"],
        }))

    async def presence_message(self, event):
        if event["user_id"] == str(getattr(self.user, "id", "")):
            return
        await self.send(text_data=json.dumps({
            "type": "presence",
            "event": event["event"],
            "user_id": event["user_id"],
            "user_name": event["user_name"],
        }))

    async def send_error(self, detail):
        await self.send(text_data=json.dumps({
            "type": "error",
            "detail": detail,
        }))

    @database_sync_to_async
    def get_room(self):
        if not self.user or not self.user.is_authenticated:
            return None

        try:
            room = ensure_chat_room_for_booking(
                Booking.objects.select_related(
                    "patient__user",
                    "psychologist__user",
                ).get(id=self.appointment_id)
            )
        except Exception:
            logger.exception("Failed to load chat room for appointment %s", self.appointment_id)
            return None

        if not room.can_participate(self.user):
            logger.warning("User %s denied websocket chat room %s", self.user.id, room.id)
            return None

        return {"id": room.id, "is_active": room.is_active}

    @database_sync_to_async
    def create_message(self, content):
        try:
            room = ChatRoom.objects.select_related(
                "appointment",
                "patient__user",
                "psychologist__user",
            ).get(id=self.room_id)
            room.sync_active_state(save=True)

            if not room.is_active:
                return None

            if not room.can_participate(self.user):
                return None

            message = Message.objects.create(
                room=room,
                sender=self.user,
                content=content,
            )
            recipient = (
                room.psychologist.user
                if self.user.id == room.patient.user_id
                else room.patient.user
            )
            create_notification(
                recipient,
                f"New message from {self.user.full_name}: {content[:80]}",
                target_url="/patient/messages" if recipient.role == "PATIENT" else "/psychologist/messages",
            )
            serializer_data = MessageSerializer(message).data
            return json.loads(JSONRenderer().render(serializer_data))
        except Exception:
            logger.exception("Failed to create chat message in room %s", getattr(self, "room_id", None))
            return None
