from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from .models import Notification
from .serializers import NotificationSerializer


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
        return

    payload = NotificationSerializer(notification).data
    async_to_sync(channel_layer.group_send)(
        get_user_notification_group(notification.recipient_id),
        {
            "type": "notification.message",
            "notification": payload,
        },
    )


"""
CREATE NEW NOTIFICATION
"""
def create_notification(recipient, message):
    notification = Notification.objects.create(
        recipient=recipient,
        message=message,
    )
    transaction.on_commit(lambda: _dispatch_notification(notification))
    return notification


"""
BULK NOTIFICATION
"""
def notify_many(recipients, message):
    notifications = []
    for recipient in recipients:
        notifications.append(create_notification(recipient, message))
    return notifications

