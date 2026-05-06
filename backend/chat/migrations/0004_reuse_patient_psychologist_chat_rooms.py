from django.db import migrations, models
from django.db.models import Count


def consolidate_chat_rooms(apps, schema_editor):
    Booking = apps.get_model("appointments", "Booking")
    ChatRoom = apps.get_model("chat", "ChatRoom")
    Message = apps.get_model("chat", "Message")

    duplicate_pairs = (
        ChatRoom.objects.values("patient_id", "psychologist_id")
        .annotate(room_count=Count("id"))
        .filter(room_count__gt=1)
    )

    for pair in duplicate_pairs:
        patient_id = pair["patient_id"]
        psychologist_id = pair["psychologist_id"]
        rooms = list(
            ChatRoom.objects.filter(
                patient_id=patient_id,
                psychologist_id=psychologist_id,
            ).order_by("-is_active", "-updated_at", "-created_at")
        )
        if not rooms:
            continue

        active_booking = (
            Booking.objects.filter(
                patient_id=patient_id,
                psychologist_id=psychologist_id,
                status="CONFIRMED",
            )
            .order_by("date", "start_time", "-created_at")
            .first()
        )
        keeper = next(
            (
                room
                for room in rooms
                if active_booking and room.appointment_id == active_booking.id
            ),
            rooms[0],
        )

        duplicate_room_ids = [
            room.id for room in rooms if room.id != keeper.id
        ]
        if duplicate_room_ids:
            Message.objects.filter(room_id__in=duplicate_room_ids).update(room=keeper)
            ChatRoom.objects.filter(id__in=duplicate_room_ids).delete()

        if active_booking and keeper.appointment_id != active_booking.id:
            keeper.appointment_id = active_booking.id
            keeper.is_active = True
            keeper.save(update_fields=["appointment", "is_active", "updated_at"])
        elif not active_booking and keeper.is_active:
            keeper.is_active = False
            keeper.save(update_fields=["is_active", "updated_at"])


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0003_message_attachments"),
    ]

    operations = [
        migrations.RunPython(consolidate_chat_rooms, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="chatroom",
            constraint=models.UniqueConstraint(
                fields=("patient", "psychologist"),
                name="unique_chat_room_per_patient_psychologist",
            ),
        ),
    ]
