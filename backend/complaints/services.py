from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from django.utils import timezone

INDIA_TZ = ZoneInfo("Asia/Kolkata")


def booking_slot_end_at(booking):
    return timezone.make_aware(
        datetime.combine(booking.date, booking.end_time),
        INDIA_TZ,
    )


def complaint_window_for_booking(booking):
    consultation = getattr(booking, "consultation_session", None)
    actual_end_time = getattr(consultation, "ended_at", None)
    if not actual_end_time:
        return None, None

    slot_end_time = booking_slot_end_at(booking)
    return actual_end_time, slot_end_time + timedelta(days=1)


def complaint_eligibility_for_booking(booking, patient=None):
    from complaints.models import Complaint

    submitted = False
    if patient is not None:
        submitted = Complaint.objects.filter(booking=booking, patient=patient).exists()
    elif hasattr(booking, "complaint"):
        submitted = True

    complaint_start, complaint_end = complaint_window_for_booking(booking)
    now = timezone.now()

    allowed = (
        booking.status == "COMPLETED"
        and complaint_start is not None
        and complaint_start <= now <= complaint_end
        and not submitted
    )

    reason = None
    if booking.status != "COMPLETED":
        reason = "Appointment is not completed."
    elif complaint_start is None:
        reason = "Consultation end time is not available."
    elif now < complaint_start:
        reason = "Complaint window has not started."
    elif now > complaint_end:
        reason = "Complaint window is closed."
    elif submitted:
        reason = "A complaint already exists for this appointment."

    return {
        "can_raise": allowed,
        "reason": reason,
        "submitted": submitted,
        "actual_end_time": complaint_start,
        "complaint_allowed_until": complaint_end,
    }
