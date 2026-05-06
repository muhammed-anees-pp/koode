from django.db import migrations


STALE_COLUMNS = [
    "consultation_room_id",
    "consultation_join_requested",
    "consultation_patient_admitted",
]


def drop_stale_consultation_columns(apps, schema_editor):
    table_name = "appointments_booking"
    quote_name = schema_editor.quote_name

    with schema_editor.connection.cursor() as cursor:
        existing_columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor,
                table_name,
            )
        }

        columns_to_drop = [
            column for column in STALE_COLUMNS if column in existing_columns
        ]
        if not columns_to_drop:
            return

        vendor = schema_editor.connection.vendor

        if vendor == "sqlite":
            cursor.execute(
                "DROP INDEX IF EXISTS "
                f"{quote_name('appointments_booking_consultation_room_id_6805928e')}"
            )

        for column in columns_to_drop:
            if vendor == "postgresql":
                cursor.execute(
                    f"ALTER TABLE {quote_name(table_name)} "
                    f"DROP COLUMN IF EXISTS {quote_name(column)}"
                )
            else:
                cursor.execute(
                    f"ALTER TABLE {quote_name(table_name)} "
                    f"DROP COLUMN {quote_name(column)}"
                )


class Migration(migrations.Migration):

    dependencies = [
        ("appointments", "0003_remove_legacy_booking_consultation_fields"),
    ]

    operations = [
        migrations.RunPython(
            drop_stale_consultation_columns,
            migrations.RunPython.noop,
        ),
    ]
