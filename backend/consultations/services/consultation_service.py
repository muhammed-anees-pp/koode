from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from django.utils import timezone
from consultations.models import Consultation


CONSULTATION_OPEN_EARLY_MINUTES = 5
INDIA_TZ = ZoneInfo("Asia/Kolkata")


"""
CONSULTATION ROOM ID
"""
def consultation_room_id(booking):
    return f"consultation_{booking.id}"


"""
CREATE CONSULTATION
"""
def create_consultation_for_booking(booking):
    try:
        return booking.consultation_session
    except Consultation.DoesNotExist:
        pass

    consultation, _ = Consultation.objects.get_or_create(
        booking=booking,
        defaults={"room_id": consultation_room_id(booking)},
    )
    return consultation


"""
APPOINTMENT TIME IN IST
"""
def appointment_datetime(date_value, time_value):
    return datetime.combine(date_value, time_value, tzinfo=INDIA_TZ)


"""
CONSULTATION WINDOW START
"""
def consultation_window_start(booking):
    return appointment_datetime(booking.date, booking.start_time) - timedelta(
        minutes=CONSULTATION_OPEN_EARLY_MINUTES
    )


"""
CONSULTATOIN WINDOW END
"""
def consultation_window_end(booking):
    return appointment_datetime(booking.date, booking.end_time)


"""
CONSULTATION ROOM STATUS
"""
def is_consultation_open(consultation):
    booking = consultation.booking
    if booking.status in {"COMPLETED", "CANCELLED"}:
        return False
    if booking.payment_status != "PAID":
        return False
    if consultation.status in {"COMPLETED", "CANCELLED"}:
        return False
    now = timezone.now().astimezone(INDIA_TZ)
    return consultation_window_start(booking) <= now <= consultation_window_end(booking)


"""
CONSULTATION STATE FOR SESSION
"""
def consultation_state_for_session(consultation, user=None):
    booking = consultation.booking
    state = {
        "id": consultation.id,
        "room_id": consultation.room_id,
        "status": consultation.status,
        "is_open": is_consultation_open(consultation),
        "opens_at": consultation_window_start(booking),
        "psychologist_joined": consultation.psychologist_joined,
        "patient_joined": consultation.patient_joined,
        "patient_requested_join": consultation.patient_requested_join,
        "started_at": consultation.started_at,
        "ended_at": consultation.ended_at,
        "patient_note": consultation.patient_note,
    }

    if user and getattr(user, "role", None) in {"PSYCHOLOGIST", "ADMIN"}:
        state["psychologist_note"] = consultation.psychologist_note

    return state


def consultation_state(booking, user=None):
    return consultation_state_for_session(create_consultation_for_booking(booking), user=user)


def user_can_access_consultation(user, consultation):
    booking = consultation.booking
    if not user.is_authenticated:
        return False
    if user.role == "PATIENT":
        return booking.patient.user_id == user.id
    if user.role == "PSYCHOLOGIST":
        return booking.psychologist.user_id == user.id
    return user.role == "ADMIN"
