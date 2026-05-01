from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def _send_html_email(subject, text_content, html_content, recipient_email):
    email = EmailMultiAlternatives(
        subject,
        text_content,
        settings.DEFAULT_FROM_EMAIL,
        [recipient_email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send()


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def send_psychologist_application_status_email(
    self,
    email,
    full_name,
    application_status,
    interview_status,
    login_link=None,
):
    subject = f"Koode psychologist application status: {application_status}"
    greeting_name = full_name or "Psychologist"
    login_text = f"\nYou can log in here:\n{login_link}\n" if login_link else ""
    login_html = (
        f"""
        <p>
            <a href="{login_link}"
               style="background-color:#2563eb;color:white;padding:10px 18px;text-decoration:none;border-radius:5px;display:inline-block;">
                Login to Koode
            </a>
        </p>
        """
        if login_link
        else ""
    )

    text_content = f"""
Hi {greeting_name},

Your Koode psychologist application status has been updated.

Application status: {application_status}
Interview status: {interview_status}
{login_text}
Thank you,
Koode Team
"""

    html_content = f"""
    <html>
        <body>
            <p>Hi {greeting_name},</p>
            <p>Your Koode psychologist application status has been updated.</p>
            <p><strong>Application status:</strong> {application_status}</p>
            <p><strong>Interview status:</strong> {interview_status}</p>
            {login_html}
            <p>Thank you,<br>Koode Team</p>
        </body>
    </html>
    """

    _send_html_email(subject, text_content, html_content, email)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def send_psychologist_interview_scheduled_email(
    self,
    email,
    full_name,
    scheduled_for,
    application_status,
    interview_status,
):
    subject = "Koode psychologist interview scheduled"
    greeting_name = full_name or "Psychologist"

    text_content = f"""
Hi {greeting_name},

Your Koode psychologist interview has been scheduled.

Scheduled for: {scheduled_for}
Application status: {application_status}
Interview status: {interview_status}

Thank you,
Koode Team
"""

    html_content = f"""
    <html>
        <body>
            <p>Hi {greeting_name},</p>
            <p>Your Koode psychologist interview has been scheduled.</p>
            <p><strong>Scheduled for:</strong> {scheduled_for}</p>
            <p><strong>Application status:</strong> {application_status}</p>
            <p><strong>Interview status:</strong> {interview_status}</p>
            <p>Thank you,<br>Koode Team</p>
        </body>
    </html>
    """

    _send_html_email(subject, text_content, html_content, email)
