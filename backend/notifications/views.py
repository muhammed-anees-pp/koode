import logging
from functools import wraps
from django.db.models import Count, Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Notification
from .serializers import NotificationSerializer


logger = logging.getLogger(__name__)


def log_unexpected_errors(action):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except (APIException, Http404):
                raise
            except Exception as exc:
                logger.exception("Unexpected error while %s", action)
                raise APIException("Something went wrong. Please try again later.") from exc

        return wrapper

    return decorator


"""
NOTIFICATION LIST VIEW
"""
class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @log_unexpected_errors("listing notifications")
    def get(self, request):
        notifications = Notification.objects.filter(recipient=request.user)
        unread_count = notifications.aggregate(
            unread_count=Count("id", filter=Q(is_read=False))
        )["unread_count"]

        serializer = NotificationSerializer(notifications[:50], many=True)
        logger.info(
            "Returned notifications for user %s with %s unread",
            request.user.id,
            unread_count,
        )
        return Response(
            {
                "results": serializer.data,
                "unread_count": unread_count,
            },
            status=status.HTTP_200_OK,
        )


"""
READ NOTIFICATION VIEW
"""
class NotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @log_unexpected_errors("marking notification read")
    def post(self, request, notification_id):
        notification = get_object_or_404(
            Notification,
            id=notification_id,
            recipient=request.user,
        )

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])
            logger.info("Notification %s marked read by user %s", notification_id, request.user.id)

        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)


"""
MARK ALL READ VIEW
"""
class NotificationMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @log_unexpected_errors("marking all notifications read")
    def post(self, request):
        updated_count = Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(is_read=True)

        logger.info("Marked %s notifications read for user %s", updated_count, request.user.id)

        return Response({"detail": "All notifications marked as read"}, status=status.HTTP_200_OK)
