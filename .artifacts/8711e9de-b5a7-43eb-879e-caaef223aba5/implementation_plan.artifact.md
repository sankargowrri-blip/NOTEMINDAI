# Implementation Plan - Fix Database Schema Mismatch (Registration Error)

The "Internal server error during registration" is caused by a mismatch between the new Python code and the existing production database. We added "Security Question" fields to the code, but the database in the cloud doesn't have these columns yet.

## Root Cause
- **Database Schema**: The `users` table on Render is missing the `security_question` and `security_answer` columns.
- **Insert Failure**: When a user tries to register, the server tries to save these new fields, but the database rejects the command because it doesn't recognize the columns.

## Proposed Changes

### 1. Database: Auto-Migration Logic
- **[MODIFY] [postgres.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/db/postgres.py)**:
    - Update `init_db()` to manually run `ALTER TABLE` commands.
    - This will automatically add the missing `security_question` and `security_answer` columns to your production database without deleting any existing data.

### 2. Backend: Robustness
- **[MODIFY] [routers/auth.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/auth.py)**:
    - Ensure all imports are correct and handle potential database errors more gracefully.

---

## Verification Plan

### Step 1: Deploy & Auto-Repair
1.  I will push the updated code to GitHub.
2.  You need to click **"Manual Deploy -> Clear Cache and Deploy"** on Render.
3.  On startup, the server will detect the missing columns and add them automatically.

### Step 2: Test Registration
1.  Refresh the `/register` page.
2.  Fill in your details and pick a security question.
3.  Click **"Create Account"**.
4.  It should now succeed!

**I am applying the database auto-repair logic now. Do you want me to proceed?**
