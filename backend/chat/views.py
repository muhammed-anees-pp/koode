import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.shortcuts import get_object_or_404
from django.db.models import OuterRef, Prefetch, Subquery
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.models import Booking
from chat.models import ChatRoom, Message
from chat.serializers import ChatRoomSerializer, MessageSerializer
from chat.services.chat_service import ensure_chat_room_for_booking, mark_room_messages_read
from notifications.services import create_notification


logger = logging.getLogger(__name__)
MAX_CHAT_ATTACHMENT_SIZE = 10 * 1024 * 1024


def get_participant_booking_or_403(user, appointment_id):
    booking = get_object_or_404(
        Booking.objects.select_related("patient__user", "psychologist__user"),
        id=appointment_id,
    )
    if user.id not in {booking.patient.user_id, booking.psychologist.user_id}:
        logger.warning("User %s denied chat access for booking %s", user.id, appointment_id)
        raise PermissionDenied("You do not have access to this chat.")
    return booking



"""
CHAT ROOM VIEW
"""
class AppointmentChatRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, appointment_id):
        booking = get_participant_booking_or_403(request.user, appointment_id)
        room = ensure_chat_room_for_booking(booking)
        return Response(ChatRoomSerializer(room).data)


"""
CHAT ROOM LIST VIEW
"""
class ChatRoomListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        active_bookings = Booking.objects.select_related(
            "patient",
            "psychologist",
        ).filter(status="CONFIRMED")

        if request.user.role == "PATIENT":
            active_bookings = active_bookings.filter(patient__user=request.user)
        elif request.user.role == "PSYCHOLOGIST":
            active_bookings = active_bookings.filter(psychologist__user=request.user)
        else:
            active_bookings = Booking.objects.none()

        for booking in active_bookings:
            ensure_chat_room_for_booking(booking)

        last_message_qs = Message.objects.filter(room=OuterRef("pk")).order_by("-created_at")
        rooms = ChatRoom.objects.select_related(
            "appointment",
            "patient__user",
            "psychologist__user",
        ).prefetch_related(
            Prefetch(
                "messages",
                queryset=Message.objects.order_by("-created_at")[:1],
                to_attr="prefetched_last_messages",
            )
        ).annotate(
            last_message_time=Subquery(last_message_qs.values("created_at")[:1])
        )

        if request.user.role == "PATIENT":
            rooms = rooms.filter(patient__user=request.user)
        elif request.user.role == "PSYCHOLOGIST":
            rooms = rooms.filter(psychologist__user=request.user)
        else:
            rooms = ChatRoom.objects.none()

        rooms = list(rooms.order_by("-last_message_time", "-updated_at"))
        for room in rooms:
            room.sync_active_state(save=True)
            room.last_message_obj = room.prefetched_last_messages[0] if getattr(room, "prefetched_last_messages", None) else None

        serializer = ChatRoomSerializer(rooms, many=True, context={"request": request})
        return Response(serializer.data)


"""
CHAT MESSAGE LIST
"""
class AppointmentChatMessageListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, appointment_id):
        booking = get_participant_booking_or_403(request.user, appointment_id)
        room = ensure_chat_room_for_booking(booking)

        if not room.is_active and booking.status not in {"COMPLETED", "CANCELLED"}:
            room.sync_active_state(save=True)

        mark_room_messages_read(room, request.user)
        messages = Message.objects.filter(room=room).select_related("sender")
        serializer = MessageSerializer(
            messages,
            many=True,
            context={"request": request},
        )
        return Response(
            {
                "room": ChatRoomSerializer(room).data,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


"""
CHAT FILE UPLOAD VIEW
"""
class AppointmentChatFileUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, appointment_id):
        booking = get_participant_booking_or_403(request.user, appointment_id)
        room = ensure_chat_room_for_booking(booking)
        room.sync_active_state(save=True)

        if not room.is_active:
            return Response(
                {"detail": "Chat is not active for this appointment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response(
                {"file": "Choose a file to send."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file.size > MAX_CHAT_ATTACHMENT_SIZE:
            return Response(
                {"file": "File size must be 10 MB or less."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            message = Message.objects.create(
                room=room,
                sender=request.user,
                message_type=Message.MESSAGE_TYPE_FILE,
                content=request.data.get("caption", "").strip(),
                attachment=uploaded_file,
                attachment_name=uploaded_file.name,
                attachment_size=uploaded_file.size,
                attachment_content_type=getattr(uploaded_file, "content_type", "") or "",
            )
        except Exception:
            logger.exception("Failed to save chat attachment for appointment %s", appointment_id)
            return Response(
                {
                    "detail": (
                        "Unable to save this file. Check media storage configuration "
                        "and permissions."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        recipient = (
            room.psychologist.user
            if request.user.id == room.patient.user_id
            else room.patient.user
        )
        create_notification(
            recipient,
            f"{request.user.full_name} sent a file: {uploaded_file.name}",
            target_url="/patient/messages" if recipient.role == "PATIENT" else "/psychologist/messages",
        )
        serializer = MessageSerializer(message, context={"request": request})
        message_data = serializer.data

        channel_layer = get_channel_layer()
        if channel_layer:
            try:
                async_to_sync(channel_layer.group_send)(
                    f"chat_{appointment_id}",
                    {
                        "type": "chat.message",
                        "message": message_data,
                    },
                )
            except Exception:
                logger.exception("Failed to broadcast chat attachment for appointment %s", appointment_id)

        return Response(message_data, status=status.HTTP_201_CREATED)
