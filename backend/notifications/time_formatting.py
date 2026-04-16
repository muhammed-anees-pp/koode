from datetime import datetime, timezone as datetime_timezone
from zoneinfo import ZoneInfo

from django.utils import timezone


INDIA_TZ = ZoneInfo("Asia/Kolkata")


def format_india_date(date_value):
    return f"{date_value.day} {date_value.strftime('%b %Y')}"


def format_india_time(time_value):
    return time_value.strftime("%I:%M %p").lstrip("0")


def format_india_datetime(datetime_value):
    if timezone.is_naive(datetime_value):
        datetime_value = timezone.make_aware(datetime_value, datetime_timezone.utc)

    india_datetime = timezone.localtime(datetime_value, INDIA_TZ)
    return f"{format_india_date(india_datetime.date())} at {format_india_time(india_datetime.time())} IST"


def format_india_slot(date_value, time_value):
    slot_datetime = datetime.combine(date_value, time_value, tzinfo=INDIA_TZ)
    return f"{format_india_date(slot_datetime.date())} at {format_india_time(slot_datetime.time())} IST"
