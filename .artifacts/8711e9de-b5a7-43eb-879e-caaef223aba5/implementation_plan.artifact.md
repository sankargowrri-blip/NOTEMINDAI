# Implementation Plan - Password Reset & Email Integration

The goal is to implement a fully functional "Forgot Password" system by integrating an email sending service into the backend.

## User Review Required

> [!IMPORTANT]
> **Email Provider Credentials**: To send real emails, you will need an SMTP server (like Gmail, Outlook, or Brevo). You will need to add your `SMTP_USER` and `SMTP_PASSWORD` to your **Render Dashboard** environment variables.
> **Note for Gmail users**: You must use an **"App Password"** instead of your regular login password for security.

## Proposed Changes

### 1. Configuration & Security
- **[MODIFY] [config.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/config.py)**:
    - Add `smtp_server`, `smtp_port`, `smtp_user`, `smtp_password`, and `emails_from` fields to the `Settings` class.

### 2. Email Service
- **[NEW] [services/email_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/email_service.py)**:
    - Implement a thread-safe email dispatcher using Python's `smtplib`.
    - Create a function `send_reset_password_email(email, token)` that formats a professional reset link.

### 3. Authentication Router
- **[MODIFY] [routers/auth.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/auth.py)**:
    - Update the `forgot-password` endpoint to call the new email service using `BackgroundTasks` (to ensure the user doesn't have to wait for the email to send before seeing the success message).
    - Fix minor linter errors (missing `re`, `time`, etc. identified in earlier logs).

### 4. Infrastructure (Render)
- **[MODIFY] [render.yaml](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/render.yaml)**:
    - Declare the new SMTP environment variables so you can easily edit them in the dashboard.

---

## Verification Plan

### Manual Verification
1.  **Dashboard Check**: Add SMTP credentials to Render.
2.  **Trigger**: Click "Forgot Password" on the website and enter your email.
3.  **Inbox**: Verify a professional email arrives with a link.
4.  **Reset**: Click the link and set a new password. Verify you can now log in with the new password.

**Shall I proceed with implementing real email support?**
