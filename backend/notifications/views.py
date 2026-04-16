from django.db.models import Count, Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Notification
from .serializers import NotificationSerializer


"""
NOTIFICATION LIST VIEW
"""
class NotificationListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(recipient=request.user)
        unread_count = notifications.aggregate(
            unread_count=Count("id", filter=Q(is_read=False))
        )["unread_count"]

        serializer = NotificationSerializer(notifications[:50], many=True)
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

    def post(self, request, notification_id):
        notification = Notification.objects.filter(
            id=notification_id,
            recipient=request.user,
        ).first()

        if not notification:
            return Response({"detail": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read"])

        return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)


"""
MARK ALL READ VIEW
"""
class NotificationMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(is_read=True)

        return Response({"detail": "All notifications marked as read"}, status=status.HTTP_200_OK)

