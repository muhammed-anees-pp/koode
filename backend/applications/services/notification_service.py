import logging
from accounts.models import User
from django.conf import settings
from django.db import transaction
from applications.tasks import (
    send_psychologist_application_status_email,
    send_psychologist_interview_scheduled_email,
)
from notifications.services import create_notification, notify_many
from notifications.time_formatting import format_india_datetime


logger = logging.getLogger(__name__)


STATUS_LABELS = {
    "DRAFT": "Draft",
    "SUBMITTED": "Submitted",
    "INTERVIEW_SCHEDULED": "Interview Scheduled",
    "INTERVIEW_COMPLETED": "Interview Completed",
    "APPROVED": "Approved",
    "REJECTED": "Rejected",
    "SCHEDULED": "Scheduled",
    "WAITING": "Waiting Room",
    "ONGOING": "Ongoing",
    "COMPLETED": "Completed",
    "CANCELLED": "Cancelled",
}


def _active_admins():
    return User.objects.filter(role="ADMIN", is_active=True, is_staff=True)


def _status_label(status):
    return STATUS_LABELS.get(status, status or "Not Scheduled")


def _interview_status(application):
    try:
        interview = getattr(application, "interview", None)
    except Exception:
        logger.exception("Failed to read interview status for application %s", application.id)
        return "Not Scheduled"

    return _status_label(getattr(interview, "status", None))


def _psychologist_login_link():
    frontend_url = (settings.PSYCHOLOGIST_FRONTEND_URL or "").rstrip("/")
    if not frontend_url:
        return None
    return f"{frontend_url}/login"


def _enqueue_status_email(application, new_status):
    login_link = _psychologist_login_link() if new_status == "APPROVED" else None
    transaction.on_commit(
        lambda: send_psychologist_application_status_email.delay(
            application.user.email,
            application.user.full_name,
            _status_label(new_status),
            _interview_status(application),
            login_link,
        )
    )


def _enqueue_interview_scheduled_email(application):
    transaction.on_commit(
        lambda: send_psychologist_interview_scheduled_email.delay(
            application.user.email,
            application.user.full_name,
            format_india_datetime(application.interview_date),
            _status_label(application.status),
            _interview_status(application),
        )
    )


def notify_admins_application_submitted(application):
    admins = _active_admins()
    message = (
        f"New psychologist application submitted by {application.user.full_name} "
        f"for {application.job_title}."
    )

    try:
        notifications = notify_many(admins, message, target_url=f"/admin/applications/{application.id}")
        logger.info(
            "Notified %s admins about application %s submission",
            len(notifications),
            application.id,
        )
    except Exception:
        logger.exception("Failed to notify admins about application %s submission", application.id)


def notify_applicant_status_changed(application, old_status, new_status):
    if not new_status or old_status == new_status:
        return

    message = f"Your application status changed from {old_status} to {new_status}."

    try:
        target_url = "/psychologist/home" if new_status == "APPROVED" else "/psychologist/approval-waiting"
        create_notification(application.user, message, target_url=target_url)
        logger.info(
            "Notified applicant user %s about application %s status change from %s to %s",
            application.user_id,
            application.id,
            old_status,
            new_status,
        )
    except Exception:
        logger.exception("Failed to notify applicant about application %s status change", application.id)

    try:
        _enqueue_status_email(application, new_status)
        logger.info(
            "Queued applicant status email for user %s about application %s status %s",
            application.user_id,
            application.id,
            new_status,
        )
    except Exception:
        logger.exception("Failed to queue applicant status email for application %s", application.id)


def notify_applicant_interview_scheduled(application):
    message = f"Your interview has been scheduled for {format_india_datetime(application.interview_date)}."

    try:
        interview = getattr(application, "interview", None)
        target_url = (
            f"/psychologist/interview/{interview.id}"
            if interview
            else "/psychologist/approval-waiting"
        )
        create_notification(application.user, message, target_url=target_url)
        logger.info(
            "Notified applicant user %s about interview schedule for application %s",
            application.user_id,
            application.id,
        )
    except Exception:
        logger.exception("Failed to notify applicant about interview schedule for application %s", application.id)

    try:
        _enqueue_interview_scheduled_email(application)
        logger.info(
            "Queued interview scheduled email for user %s about application %s",
            application.user_id,
            application.id,
        )
    except Exception:
        logger.exception("Failed to queue interview scheduled email for application %s", application.id)
