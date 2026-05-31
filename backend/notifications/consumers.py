import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .services import get_user_notification_group


logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            logger.warning("Rejected unauthenticated notification websocket connection")
            await self.close(code=4401)
            return

        self.group_name = get_user_notification_group(user.id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info("Notification websocket connected for user %s", user.id)

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            logger.info("Notification websocket disconnected from %s with code %s", self.group_name, close_code)

    async def receive(self, text_data=None, bytes_data=None):
        return

    async def notification_message(self, event):
        try:
            await self.send(text_data=json.dumps({
                "type": "notification",
                "notification": event["notification"],
            }))
        except Exception:
            logger.exception("Failed to send notification websocket message")
