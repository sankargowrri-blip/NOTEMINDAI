# Implementation Plan - Final Note Deletion & Cleanup Fix

The goal is to resolve the "Failed to delete note" error by ensuring all dependencies (linked data and files) are automatically cleaned up when a note is removed.

## User Review Required

> [!IMPORTANT]
> **Database Self-Healing**: I am adding a "CASCADE" rule to all study analytics. This means when you delete a note, your study sessions and weak topics for that note will be safely deleted automatically.
> **Storage Cleanup**: I am updating the system to physically delete the original and enhanced files from the server's hard drive or S3 storage when a note is removed. This saves you space and keeps your account clean.

## Proposed Changes

### 1. Database: Integrity Rules
- **[MODIFY] [models/analytics.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/analytics.py)**:
    - Add `ondelete="CASCADE"` to `StudySession` and `WeakTopic` foreign keys.
- **[MODIFY] [db/postgres.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/db/postgres.py)**:
    - Update the auto-migration script to apply these CASCADE rules to your live database on Render.

### 2. Services: Storage Disposal
- **[MODIFY] [services/storage_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/storage_service.py)**:
    - Add a `delete_file` function to securely remove files from local storage or AWS S3.

### 3. Router: Unified Deletion
- **[MODIFY] [routers/notes.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/notes.py)**:
    - Update the `delete_note` endpoint to perform a "Triple Cleanup":
        1.  Delete the main database record (triggers CASCADE for Quizzes/Analytics).
        2.  Delete the AI data from MongoDB.
        3.  Delete the physical files from storage.

---

## Verification Plan

### Manual Verification
1.  **Deletion Test**: Upload a note, generate a quiz, and start a study session.
2.  **Trigger**: Delete the note from "My Notes".
3.  **Success**: Verify the note disappears instantly without the "Failed to delete" toast.
4.  **Backend Check**: Verify that checking Render logs shows `DB_LOG: Cleanup success`.

**I am applying these final stabilization fixes now. Shall I proceed?** 🚀🛠️🎓
