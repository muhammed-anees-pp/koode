from django.db import migrations, models
import django.db.models.deletion


def release_cancelled_booking_slots(apps, schema_editor):
    Booking = apps.get_model("appointments", "Booking")
    Booking.objects.filter(status="CANCELLED").update(slot=None)


class Migration(migrations.Migration):

    dependencies = [
        ("appointments", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="booking",
            name="slot",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="booking",
                to="appointments.availableslot",
            ),
        ),
        migrations.RunPython(
            release_cancelled_booking_slots,
            migrations.RunPython.noop,
        ),
    ]
