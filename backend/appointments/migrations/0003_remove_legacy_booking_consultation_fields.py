from django.db import migrations


LEGACY_COLUMNS = [
    "consultation_room_id",
    "consultation_join_requested",
    "consultation_patient_admitted",
]


def remove_legacy_consultation_fields(apps, schema_editor):
    table_name = "appointments_booking"
    existing_columns = {
        column.name for column in schema_editor.connection.introspection.get_table_description(
            schema_editor.connection.cursor(),
            table_name,
        )
    }

    columns_to_remove = [column for column in LEGACY_COLUMNS if column in existing_columns]
    if not columns_to_remove:
        return

    vendor = schema_editor.connection.vendor
    quote_name = schema_editor.quote_name

    with schema_editor.connection.cursor() as cursor:
        if vendor == "sqlite":
            cursor.execute("DROP INDEX IF EXISTS appointments_booking_consultation_room_id_6805928e")
            for column in columns_to_remove:
                cursor.execute(
                    f"ALTER TABLE {quote_name(table_name)} DROP COLUMN {quote_name(column)}"
                )
            return

        if vendor == "postgresql":
            for column in columns_to_remove:
                cursor.execute(
                    f"ALTER TABLE {quote_name(table_name)} DROP COLUMN IF EXISTS {quote_name(column)}"
                )
            return

        if vendor == "mysql":
            for column in columns_to_remove:
                cursor.execute(
                    f"ALTER TABLE {quote_name(table_name)} DROP COLUMN {quote_name(column)}"
                )
            return

        for column in columns_to_remove:
            cursor.execute(
                f"ALTER TABLE {quote_name(table_name)} DROP COLUMN {quote_name(column)}"
            )


class Migration(migrations.Migration):

    dependencies = [
        ("appointments", "0002_booking_slot_nullable"),
    ]

    operations = [
        migrations.RunPython(
            remove_legacy_consultation_fields,
            migrations.RunPython.noop,
        ),
    ]
