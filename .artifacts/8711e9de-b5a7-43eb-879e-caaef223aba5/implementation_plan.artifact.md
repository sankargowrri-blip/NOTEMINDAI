# Implementation Plan - Final Error Fixes & Password Reset UI

The goal is to resolve all remaining linter/syntax errors in the backend and implement the missing "Reset Password" frontend page to complete the user recovery system.

## User Review Required

> [!IMPORTANT]
> **Password Reset Link**: The reset link sent to your email will now lead to a real page on your website where you can enter a new password.
> **Backend Stability**: I am fixing several "hidden" errors identified in the system logs to ensure 100% uptime for all users.

## Proposed Changes

### 1. Backend: Code Stability
- **[MODIFY] [routers/auth.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/auth.py)**:
    - Ensure all required modules (`re`, `time`, `json`) are imported.
    - Fix exception handling to be robust for all users.
- **[MODIFY] [routers/quiz.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/quiz.py)**:
    - Resolve the `Exception` and `json.dumps` reference issues.
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Fix the `any` and `getattr` linter errors.

### 2. Frontend: Password Reset Completion
- **[MODIFY] [src/lib/api.ts](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/lib/api.ts)**:
    - Add `resetPassword: (body) => api.post("/api/auth/reset-password", body)` to the `authApi` object.
- **[NEW] [reset-password/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(auth)/reset-password/page.tsx)**:
    - Build a professional UI for choosing a new password.
    - Handle the token from the URL automatically.

---

## Verification Plan

### Manual Verification
1.  **Deploy**: Push all changes to GitHub and Vercel.
2.  **Forgot Password**: Request a link (ensure SMTP is configured on Render).
3.  **Reset UI**: Verify the link opens the new "Reset Password" page.
4.  **Success**: Change the password and verify you can log in with the NEW credentials.
5.  **Logs Check**: Ensure Render logs are clear of any `NameError` or `AttributeError`.

**Shall I proceed with these final stability and feature fixes?**
