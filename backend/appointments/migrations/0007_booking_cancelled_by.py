from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("appointments", "0006_drop_moved_consultation_columns"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="cancelled_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cancelled_bookings",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
