from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.conf import settings


# PASSWORD RESET LINK
@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 5},
)
def send_admin_reset_email(self, email, reset_link):

    subject = "Reset Your Admin Password"

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
