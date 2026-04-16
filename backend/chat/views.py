import logging

from django.shortcuts import get_object_or_404
from django.db.models import OuterRef, Prefetch, Subquery
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.models import Booking
from chat.models import ChatRoom, Message
from chat.serializers import ChatRoomSerializer, MessageSerializer
from chat.services.chat_service import ensure_chat_room_for_booking, mark_room_messages_read


logger = logging.getLogger(__name__)


def get_participant_booking_or_403(user, appointment_id):
    booking = get_object_or_404(
        Booking.objects.select_related("patient__user", "psychologist__user"),
        id=appointment_id,
    )
    if user.id not in {booking.patient.user_id, booking.psychologist.user_id}:
        logger.warning("User %s denied chat access for booking %s", user.id, appointment_id)
        raise PermissionDenied("You do not have access to this chat.")
    return booking


class AppointmentChatRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, appointment_id):
        booking = get_participant_booking_or_403(request.user, appointment_id)
        room = ensure_chat_room_for_booking(booking)
        return Response(ChatRoomSerializer(room).data)


class ChatRoomListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
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
