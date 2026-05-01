import logging
from accounts.models import User
from notifications.services import create_notification, notify_many
from notifications.time_formatting import format_india_datetime


logger = logging.getLogger(__name__)


def _active_admins():
    return User.objects.filter(role="ADMIN", is_active=True, is_staff=True)


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
