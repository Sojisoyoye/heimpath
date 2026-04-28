import html
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import emails  # type: ignore
import jwt
from jinja2 import Environment, FileSystemLoader, select_autoescape
from jwt.exceptions import InvalidTokenError

from app.core import security
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class EmailData:
    html_content: str
    subject: str


_jinja_env = Environment(
    loader=FileSystemLoader(Path(__file__).parent / "email-templates" / "build"),
    autoescape=select_autoescape(default=True, default_for_string=True),
)


def render_email_template(*, template_name: str, context: dict[str, Any]) -> str:
    template = _jinja_env.get_template(template_name)
    return template.render(context)


def send_email(
    *,
    email_to: str,
    subject: str = "",
    html_content: str = "",
    unsubscribe_url: str | None = None,
) -> None:
    assert settings.emails_enabled, "no provided configuration for email variables"

    if settings.sendgrid_enabled:
        _send_email_sendgrid(
            email_to=email_to,
            subject=subject,
            html_content=html_content,
            unsubscribe_url=unsubscribe_url,
        )
    else:
        _send_email_smtp(
            email_to=email_to,
            subject=subject,
            html_content=html_content,
        )


def _send_email_sendgrid(
    *,
    email_to: str,
    subject: str,
    html_content: str,
    unsubscribe_url: str | None = None,
) -> None:
    """Send email via SendGrid API."""
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Header, Mail

    message = Mail(
        from_email=(settings.EMAILS_FROM_EMAIL, settings.EMAILS_FROM_NAME),
        to_emails=email_to,
        subject=subject,
        html_content=html_content,
    )
    if unsubscribe_url:
        message.header = [
            Header("List-Unsubscribe", f"<{unsubscribe_url}>"),
            Header("List-Unsubscribe-Post", "List-Unsubscribe=One-Click"),
        ]

    sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
    response = sg.send(message)
    logger.info("SendGrid response: %s", response.status_code)


def _send_email_smtp(
    *,
    email_to: str,
    subject: str,
    html_content: str,
) -> None:
    """Send email via SMTP (legacy fallback)."""
    message = emails.Message(
        subject=subject,
        html=html_content,
        mail_from=(settings.EMAILS_FROM_NAME, settings.EMAILS_FROM_EMAIL),
    )
    smtp_options: dict[str, Any] = {
        "host": settings.SMTP_HOST,
        "port": settings.SMTP_PORT,
        "timeout": 10,
    }
    if settings.SMTP_TLS:
        smtp_options["tls"] = True
    elif settings.SMTP_SSL:
        smtp_options["ssl"] = True
    if settings.SMTP_USER:
        smtp_options["user"] = settings.SMTP_USER
    if settings.SMTP_PASSWORD:
        smtp_options["password"] = settings.SMTP_PASSWORD
    response = message.send(to=email_to, smtp=smtp_options)
    logger.info("SMTP email result: %s", response)


def generate_test_email(email_to: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Test email"
    html_content = render_email_template(
        template_name="test_email.html",
        context={"project_name": settings.PROJECT_NAME, "email": email_to},
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_reset_password_email(email_to: str, email: str, token: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Password recovery for user {email}"
    link = f"{settings.FRONTEND_HOST}/reset-password?token={token}"
    html_content = render_email_template(
        template_name="reset_password.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": email,
            "email": email_to,
            "valid_hours": settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS,
            "link": link,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_new_account_email(
    email_to: str, username: str, password: str
) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - New account for user {username}"
    html_content = render_email_template(
        template_name="new_account.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": username,
            "password": password,
            "email": email_to,
            "link": settings.FRONTEND_HOST,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_password_reset_token(email: str) -> str:
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.now(timezone.utc)
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email},
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> str | None:
    try:
        decoded_token = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        return str(decoded_token["sub"])
    except InvalidTokenError:
        return None


def generate_unsubscribe_token(user_id: uuid.UUID, notification_type: str) -> str:
    """Generate a JWT for one-click email unsubscribe.

    Args:
        user_id: The user to unsubscribe.
        notification_type: The notification type value to disable.

    Returns:
        Signed JWT string valid for 90 days.
    """
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=90)
    payload = {
        "exp": expires,
        "nbf": now,
        "sub": str(user_id),
        "type": notification_type,
        "purpose": "unsubscribe",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=security.ALGORITHM)


def verify_unsubscribe_token(token: str) -> dict[str, str] | None:
    """Verify an unsubscribe JWT and return its claims.

    Returns:
        Dict with ``user_id`` and ``notification_type``, or None if invalid.
    """
    try:
        decoded = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        if decoded.get("purpose") != "unsubscribe":
            return None
        return {
            "user_id": decoded["sub"],
            "notification_type": decoded["type"],
        }
    except (InvalidTokenError, KeyError):
        return None


def generate_email_verification_email(
    email_to: str,
    token: str,
    valid_hours: int = 24,
) -> EmailData:
    """Generate email verification email content.

    Args:
        email_to: Recipient email address.
        token: Verification token.
        valid_hours: Hours until token expires.

    Returns:
        EmailData with subject and HTML content.
    """
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Verify your email address"
    link = f"{settings.FRONTEND_HOST}/verify-email?token={token}"
    safe_email = html.escape(email_to)

    # Simple HTML template for verification email
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c3e50;">Welcome to {project_name}!</h1>
            <p>Please verify your email address ({safe_email}) by clicking the button below:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{link}"
                   style="background-color: #3498db; color: white; padding: 12px 30px;
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Verify Email
                </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3498db;">{link}</p>
            <p style="color: #666; font-size: 14px;">
                This link will expire in {valid_hours} hours.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
                If you didn't create an account with {project_name}, please ignore this email.
            </p>
        </div>
    </body>
    </html>
    """

    return EmailData(html_content=html_content, subject=subject)


def generate_password_reset_email_v2(
    email_to: str,
    token: str,
    valid_hours: int = 1,
) -> EmailData:
    """Generate password reset email content for new auth system.

    Args:
        email_to: Recipient email address.
        token: Password reset token.
        valid_hours: Hours until token expires (default 1).

    Returns:
        EmailData with subject and HTML content.
    """
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Reset your password"
    link = f"{settings.FRONTEND_HOST}/reset-password?token={token}"
    safe_email = html.escape(email_to)

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2c3e50;">{project_name} - Password Reset</h1>
            <p>We received a request to reset the password for {safe_email}. Click the button below to create a new password:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="{link}"
                   style="background-color: #e74c3c; color: white; padding: 12px 30px;
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                    Reset Password
                </a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3498db;">{link}</p>
            <p style="color: #e74c3c; font-size: 14px; font-weight: bold;">
                This link will expire in {valid_hours} hour{"s" if valid_hours != 1 else ""}.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
                If you didn't request a password reset, please ignore this email.
                Your password will remain unchanged.
            </p>
        </div>
    </body>
    </html>
    """

    return EmailData(html_content=html_content, subject=subject)
