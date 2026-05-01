import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from .models import Notification
from .serializers import NotificationSerializer


logger = logging.getLogger(__name__)


"""
GET USER GROUP
"""
def get_user_notification_group(user_id):
    return f"user_{user_id}"


"""
DISPATCH NOTIFICATION
"""
def _dispatch_notification(notification):
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.warning("No channel layer configured for notification %s", notification.id)
        return

    payload = NotificationSerializer(notification).data
    try:
        async_to_sync(channel_layer.group_send)(
            get_user_notification_group(notification.recipient_id),
            {
                "type": "notification.message",
                "notification": payload,
            },
        )
    except Exception:
        logger.exception("Failed to dispatch notification %s", notification.id)


"""
CREATE NEW NOTIFICATION
"""
def create_notification(recipient, message, target_url=""):
    notification = Notification.objects.create(
        recipient=recipient,
        message=message,
        target_url=target_url or "",
    )
    transaction.on_commit(lambda: _dispatch_notification(notification))
    logger.info("Notification %s created for user %s", notification.id, recipient.id)
    return notification


"""
BULK NOTIFICATION
"""
def notify_many(recipients, message, target_url=""):
    notifications = []
    for recipient in recipients:
        try:
            notifications.append(create_notification(recipient, message, target_url=target_url))
        except Exception:
            logger.exception("Failed to create bulk notification for user %s", getattr(recipient, "id", None))
    return notifications
