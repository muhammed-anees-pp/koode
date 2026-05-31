# Generated manually for chatbot app.

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ChatbotConversation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(default="AI assistant", max_length=120)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chatbot_conversations", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="ChatbotMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("USER", "User"), ("BOT", "Bot")], max_length=10)),
                ("content", models.TextField()),
                ("intent", models.CharField(blank=True, max_length=80)),
                ("confidence", models.FloatField(default=0)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("conversation", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="chatbot.chatbotconversation")),
            ],
            options={
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="chatbotconversation",
            index=models.Index(fields=["patient", "-updated_at"], name="chatbot_ch_patient_7699f1_idx"),
        ),
        migrations.AddIndex(
            model_name="chatbotmessage",
            index=models.Index(fields=["conversation", "created_at"], name="chatbot_ch_convers_f5a5b4_idx"),
        ),
    ]
