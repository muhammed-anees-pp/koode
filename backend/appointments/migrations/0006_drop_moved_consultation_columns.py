import json

from django.db import migrations


MOVED_CONSULTATION_COLUMNS = [
    "consultation_ended_at",
    "consultation_patient_joined",
    "consultation_patient_requested_join",
    "consultation_psychologist_joined",
    "consultation_room_id",
    "consultation_started_at",
    "consultation_status",
    "recording_file_url",
    "recording_metadata",
    "recording_status",
    "zego_recording_task_id",
]


def _existing_columns(schema_editor, table_name):
    with schema_editor.connection.cursor() as cursor:
        return {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor,
                table_name,
            )
        }


def _json_or_default(value):
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return {}


def copy_moved_consultation_data(apps, schema_editor):
    Booking = apps.get_model("appointments", "Booking")
    Consultation = apps.get_model("consultations", "Consultation")
    table_name = Booking._meta.db_table
    existing = _existing_columns(schema_editor, table_name)
    moved_existing = [column for column in MOVED_CONSULTATION_COLUMNS if column in existing]
    if not moved_existing:
        return

    select_columns = ["id", *moved_existing]
    quote = schema_editor.quote_name
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            f"SELECT {', '.join(quote(column) for column in select_columns)} "
            f"FROM {quote(table_name)}"
        )
        rows = cursor.fetchall()

    for row in rows:
        values = dict(zip(select_columns, row))
        booking_id = values["id"]
        defaults = {}

        if "consultation_room_id" in values and values["consultation_room_id"]:
            defaults["room_id"] = values["consultation_room_id"]
        else:
            defaults["room_id"] = f"consultation_{booking_id}"
        if "consultation_status" in values and values["consultation_status"]:
            defaults["status"] = values["consultation_status"]
        if "consultation_psychologist_joined" in values:
            defaults["psychologist_joined"] = bool(values["consultation_psychologist_joined"])
        if "consultation_patient_joined" in values:
            defaults["patient_joined"] = bool(values["consultation_patient_joined"])
        if "consultation_patient_requested_join" in values:
            defaults["patient_requested_join"] = bool(values["consultation_patient_requested_join"])
        if "consultation_started_at" in values:
            defaults["started_at"] = values["consultation_started_at"]
        if "consultation_ended_at" in values:
            defaults["ended_at"] = values["consultation_ended_at"]
        if "zego_recording_task_id" in values:
            defaults["zego_recording_task_id"] = values["zego_recording_task_id"] or ""
        if "recording_status" in values and values["recording_status"]:
            defaults["recording_status"] = values["recording_status"]
        if "recording_file_url" in values:
            defaults["recording_file_url"] = values["recording_file_url"] or ""
        if "recording_metadata" in values:
            defaults["recording_metadata"] = _json_or_default(values["recording_metadata"])

        Consultation.objects.update_or_create(
            booking_id=booking_id,
            defaults=defaults,
        )


def drop_moved_consultation_columns(apps, schema_editor):
    Booking = apps.get_model("appointments", "Booking")
    table_name = Booking._meta.db_table
    existing = _existing_columns(schema_editor, table_name)
    columns_to_drop = [column for column in MOVED_CONSULTATION_COLUMNS if column in existing]
    if not columns_to_drop:
        return

    if schema_editor.connection.vendor == "sqlite":
        # Rebuild the table from the current Booking model state, dropping
        # columns left behind by the temporary consultation-in-appointments work.
        schema_editor._remake_table(Booking)
        return

    quote = schema_editor.quote_name
    with schema_editor.connection.cursor() as cursor:
        for column in columns_to_drop:
            cursor.execute(
                f"ALTER TABLE {quote(table_name)} DROP COLUMN IF EXISTS {quote(column)}"
            )


class Migration(migrations.Migration):

    dependencies = [
        ("consultations", "0001_initial"),
        ("appointments", "0005_booking_consultation_fee_booking_gst_amount_and_more"),
    ]

    operations = [
        migrations.RunPython(copy_moved_consultation_data, migrations.RunPython.noop),
        migrations.RunPython(drop_moved_consultation_columns, migrations.RunPython.noop),
    ]
