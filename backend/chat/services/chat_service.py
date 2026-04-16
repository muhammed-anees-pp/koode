import logging

from django.db import transaction
from django.utils import timezone

from chat.models import ChatRoom, Message


logger = logging.getLogger(__name__)


def is_chat_enabled_for_booking(booking):
    return booking.status not in {"COMPLETED", "CANCELLED"}


def ensure_chat_room_for_booking(booking):
    with transaction.atomic():
        room, created = ChatRoom.objects.select_for_update().get_or_create(
            appointment=booking,
            defaults={
                "patient": booking.patient,
                "psychologist": booking.psychologist,
                "is_active": is_chat_enabled_for_booking(booking),
            },
        )

        desired_active = is_chat_enabled_for_booking(booking)
        fields_to_update = []

        if room.patient_id != booking.patient_id:
            room.patient = booking.patient
            fields_to_update.append("patient")

        if room.psychologist_id != booking.psychologist_id:
            room.psychologist = booking.psychologist
            fields_to_update.append("psychologist")

        if room.is_active != desired_active:
            room.is_active = desired_active
            fields_to_update.append("is_active")

        if fields_to_update:
            fields_to_update.append("updated_at")
            room.save(update_fields=fields_to_update)

    if created:
        logger.info("Created chat room %s for booking %s", room.id, booking.id)
    return room


def sync_chat_room_for_booking(booking):
    room = ensure_chat_room_for_booking(booking)
    room.sync_active_state(save=True)
    return room


def mark_room_messages_read(room, user):
    updated_count = Message.objects.filter(
        room=room,
        is_read=False,
    ).exclude(sender=user).update(is_read=True, read_at=timezone.now())

    if updated_count:
        logger.info("Marked %s messages read in chat room %s for user %s", updated_count, room.id, user.id)

    return updated_count
