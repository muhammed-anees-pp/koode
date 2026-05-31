import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("appointments", "0002_booking_slot_nullable"),
        ("patients", "0001_initial"),
        ("psychologists", "0004_psychologistprofile_highest_education"),
    ]

    operations = [
        migrations.CreateModel(
            name="ChatRoom",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("appointment", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="chat_room", to="appointments.booking")),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_rooms", to="patients.patientprofile")),
                ("psychologist", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_rooms", to="psychologists.psychologistprofile")),
            ],
        ),
        migrations.CreateModel(
            name="Message",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("content", models.TextField()),
                ("is_read", models.BooleanField(default=False)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("room", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="chat.chatroom")),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_messages", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="chatroom",
            index=models.Index(fields=["patient", "is_active"], name="chat_chatro_patient_9b3b6d_idx"),
        ),
        migrations.AddIndex(
            model_name="chatroom",
            index=models.Index(fields=["psychologist", "is_active"], name="chat_chatro_psychol_653d38_idx"),
        ),
        migrations.AddIndex(
            model_name="message",
            index=models.Index(fields=["room", "created_at"], name="chat_messag_room_id_efb2c6_idx"),
        ),
        migrations.AddIndex(
            model_name="message",
            index=models.Index(fields=["sender", "created_at"], name="chat_messag_sender__a6d987_idx"),
        ),
    ]
