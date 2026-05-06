import logging

from django.db import transaction
from django.utils import timezone

from chat.models import ChatRoom, Message


logger = logging.getLogger(__name__)


def is_chat_enabled_for_booking(booking):
    return booking.status == "CONFIRMED"


def get_active_booking_for_pair(patient, psychologist):
    return (
        patient.bookings.filter(
            psychologist=psychologist,
            status="CONFIRMED",
        )
        .order_by("date", "start_time", "-created_at")
        .first()
    )


def get_room_context_booking(booking):
    if is_chat_enabled_for_booking(booking):
        return booking

    return get_active_booking_for_pair(booking.patient, booking.psychologist) or booking


def ensure_chat_room_for_booking(booking):
    with transaction.atomic():
        room, created = ChatRoom.objects.select_for_update().get_or_create(
            patient=booking.patient,
            psychologist=booking.psychologist,
            defaults={
                "appointment": get_room_context_booking(booking),
                "is_active": bool(get_active_booking_for_pair(booking.patient, booking.psychologist)),
            },
        )

        context_booking = get_room_context_booking(booking)
        desired_active = bool(get_active_booking_for_pair(booking.patient, booking.psychologist))
        fields_to_update = []

        if room.appointment_id != context_booking.id:
            room.appointment = context_booking
            fields_to_update.append("appointment")

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
    return room


def mark_room_messages_read(room, user):
    updated_count = Message.objects.filter(
        room=room,
        is_read=False,
    ).exclude(sender=user).update(is_read=True, read_at=timezone.now())

    if updated_count:
        logger.info("Marked %s messages read in chat room %s for user %s", updated_count, room.id, user.id)

    return updated_count
