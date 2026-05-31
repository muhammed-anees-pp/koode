from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0002_rename_chat_chatro_patient_9b3b6d_idx_chat_chatro_patient_de28f7_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="message_type",
            field=models.CharField(
                choices=[("TEXT", "Text"), ("FILE", "File")],
                default="TEXT",
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="message",
            name="content",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="message",
            name="attachment",
            field=models.FileField(blank=True, null=True, upload_to="chat/attachments/%Y/%m/"),
        ),
        migrations.AddField(
            model_name="message",
            name="attachment_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="message",
            name="attachment_size",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="message",
            name="attachment_content_type",
            field=models.CharField(blank=True, max_length=120),
        ),
    ]
