from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
from accounts.models import User


# PASSWORD RESET LINK
@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def send_password_reset_email(self, email, reset_link):

    subject = "Reset Your Password"

    text_content = f"""
You requested a password reset.

Click the link below to reset your password:
{reset_link}

This link expires in 5 minutes.
"""

    html_content = f"""
    <html>
        <body>
            <p>You requested a password reset.</p>

            <p>
                <a href="{reset_link}"
                   style="
                       background-color:#2563eb;
                       color:white;
                       padding:10px 20px;
                       text-decoration:none;
                       border-radius:5px;
                       display:inline-block;
                   ">
                    Reset Password
                </a>
            </p>

            <p>This link expires in 5 minutes.</p>
        </body>
    </html>
    """

    email_message = EmailMultiAlternatives(
        subject,
        text_content,
        settings.DEFAULT_FROM_EMAIL,
        [email],
    )

    email_message.attach_alternative(html_content, "text/html")
    email_message.send()



# PATIENT VERIFICATION EMAIL
@shared_task
def send_patient_verification_email(email, verify_link):
    subject = "Verify Your Email - Koode"

    message = f"""
Hi,

Please verify your email by clicking the link below:

{verify_link}

This link will expire in 10 minutes.

If you did not register, please ignore this email.
"""

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )



# DELETE UNVERIFIED PATIENT AFTER 10 MINUTES
@shared_task
def delete_unverified_patient(user_id):
    """
    Deletes patient if still unverified after 10 minutes
    """

    try:
        user = User.objects.get(id=user_id, role="PATIENT")
    except User.DoesNotExist:
        return

    if user.is_active:
        return

    if timezone.now() - user.date_joined >= timedelta(minutes=10):
        user.delete()



# PSYCHOLOGIST VERIFICATION EMAIL
@shared_task
def send_psychologist_verification_email(email, verify_link):
    subject = "Verify Your Email - Koode"

    message = f"""
Hi,

Please verify your email by clicking the link below:

{verify_link}

This link will expire in 10 minutes.

If you did not register, please ignore this email.
"""

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )

# DELETE UNVERIFIED PSYCHOGLOGIST AFTER 10 MINUTES
@shared_task
def delete_unverified_psychologist(user_id):
    """
    Deletes patient if still unverified after 10 minutes
    """

    try:
        user = User.objects.get(id=user_id, role="PSYCHOLOGIST")
    except User.DoesNotExist:
        return

    if user.is_active:
        return

    if timezone.now() - user.date_joined >= timedelta(minutes=10):
        user.delete()