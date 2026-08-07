"""Email sending service for password reset and notifications."""
from __future__ import annotations
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger(__name__)

def send_reset_password_email(email: str, token: str):
    """Send a professional password reset email using SMTP."""
    logger.info(f"EMAIL_TRACE: Attempting to send reset email to {email}")
    
    if not settings.smtp_user or not settings.smtp_password:
        logger.error("EMAIL_TRACE: SMTP_USER or SMTP_PASSWORD missing in Render Environment!")
        return False

    reset_url = f"{settings.frontend_url}/reset-password?token={token}"
    
    subject = "Reset your NoteMind AI password"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; rounded-xl: 10px;">
            <h2 style="color: #4f58ff;">NoteMind AI</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password. Click the button below to choose a new one. This link will expire in 60 minutes.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="background-color: #4f58ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            </div>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">NoteMind AI — Your Smart Study Assistant</p>
        </div>
    </body>
    </html>
    """

    try:
        msg = MIMEMultipart()
        msg['From'] = settings.emails_from
        msg['To'] = email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(settings.smtp_server, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        
        logger.info(f"Password reset email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {email}: {str(e)}")
        return False
