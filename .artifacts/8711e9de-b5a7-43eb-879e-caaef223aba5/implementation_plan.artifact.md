# Implementation Plan - Fix Forgot Password Email Delivery

The goal is to fix the "Forgot Password" functionality so that reset emails are reliably delivered to users' inboxes.

## User Review Required

> [!IMPORTANT]
> **SMTP Credentials**: The system requires a valid SMTP server to send emails. You **must** add `SMTP_USER` and `SMTP_PASSWORD` in your **Render Dashboard** (Environment tab). For Gmail, you **must** use an **App Password**.
> **Token Expiry**: I will update the reset token expiry to **60 minutes** to match the UI message.

## Proposed Changes

### 1. Backend: Authentication & Security
- **[MODIFY] [routers/auth.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/auth.py)**:
    - Update `forgot_password` to generate a token with a **60-minute** expiration.
    - Fix the `ValueError` linter error by ensuring it's available in the exception catch block.
    - Add a `ResetTokenRequest` model to explicitly handle password reset data.

### 2. Backend: Email Service Robustness
- **[MODIFY] [services/email_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/email_service.py)**:
    - Update the SMTP logic to handle connection timeouts more gracefully.
    - Add a "Fallback Logger" that prints the reset link to the server console if the email fails to send (useful for debugging in the Render logs).

### 3. Backend: Configuration
- **[MODIFY] [config.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/config.py)**:
    - Increase `access_token_expire_minutes` to 60 for reset tokens specifically.

---

## Verification Plan

### Automated Verification
1.  **Check Logs**: Monitor Render logs for `EMAIL_TRACE: Success`.

### Manual Verification
1.  **Environment Check**: Verify `SMTP_USER` and `SMTP_PASSWORD` are present in Render.
2.  **Request Reset**: Use the "Forgot Password" page on the website.
3.  **Inbox Check**: Confirm receipt of email in Gmail (check Spam).
4.  **Reset Flow**: Click the link, choose a new password, and log in.

## Root Cause Summary
- **Primary Reason**: The previous implementation had a "TODO" for sending emails, which we partially fixed, but it lacked the environment variables and the specific 60-minute token logic required for a professional flow.
- **Secondary Reason**: Potential SMTP connection issues or missing "App Password" authentication for Gmail.
