# NoteMind AI Comprehensive Overhaul Implementation Plan

This plan outlines the steps to resolve existing bugs and implement major features including the Big Question Bank PDF export, 2GB storage limit, automatic study tracking, and improved quiz evaluation.

## User Review Required

> [!IMPORTANT]
> **Scoring Change**: The quiz system will now use a professional marking scheme: **+1 for correct**, **-1 for wrong**, and **0 for skipped**.
> **Storage Change**: Your storage quota will be set to **2 GB**. The system will block uploads if you exceed this limit.
> **Database Cleanup**: I will remove all existing user-generated data (notes, quizzes, history) to provide a fresh start for new users, while keeping your account and app structure intact.

## Proposed Changes

### 1. Big Question Bank - Full Answer & PDF Export
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Update `generate_big_questions` to return a comprehensive `full_answer` for every generated question.
- **[MODIFY] [BigQuestionsPage](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/flashcards/big-questions/page.tsx)**:
    - Add a "Full Answer" section with proper headings and depth.
    - Implement "Generate PDF" and "Download PDF" buttons using `jspdf`.
    - Ensure the PDF format is professional and exam-friendly.

### 2. Note Management & Robust Deletion
- **[MODIFY] [models/note.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/note.py)**:
    - Add `ondelete="CASCADE"` to all relationships (Quiz, FlashcardSet, StudySession, etc.) to ensure complete database cleanup.
- **[FIX] [routers/notes.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/notes.py)**:
    - Refine the `delete_note` logic to ensure physical files and vector embeddings are removed before the database record is deleted.

### 3. Note Search Optimization
- **[MODIFY] [routers/search.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/search.py)**:
    - Improve keyword search to include `unit`, `chapter`, and broader `refined_text` coverage.
    - Implement case-insensitive and partial match support for terms like "Unit 3".

### 4. Storage Quota & Usage Tracking
- **[MODIFY] [models/user.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/user.py)**:
    - Update default `storage_quota_mb` to `2048` (2 GB).
- **[MODIFY] [routers/upload.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/upload.py)**:
    - Implement a strict quota check before starting the OCR/Upload process.
- **[MODIFY] [DashboardPage](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/dashboard/page.tsx)**:
    - Add a storage usage progress bar.

### 5. Automatic Study Hours Tracking
- **[NEW] [hooks/useStudyTracker.ts](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/hooks/useStudyTracker.ts)**:
    - Implement active-session tracking (checks mouse/keyboard activity).
    - Automatically sends a session log to `/api/analytics/session` when the user is done studying.
- **[MODIFY] [DashboardPage](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/dashboard/page.tsx)**:
    - Update study time display to show Today, This Week, and This Month stats.

### 6. Legacy Data Purge
- **[NEW] [routers/admin.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/admin.py)**:
    - Add a `POST /api/admin/purge-data` endpoint (Admin only) to clear all user-generated content for a fresh system state.

### 7. Quiz Evaluation & Result Page Accuracy
- **[MODIFY] [routers/quiz.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/quiz.py)**:
    - Update `submit_quiz` to implement the **+1/-1** marking scheme.
    - Include the user's `display_name` in the response.
- **[MODIFY] [QuizPage](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/quiz/page.tsx)**:
    - Redesign the results page to show Student Name, Score breakdown, and Accuracy.
    - Use Green ✓ (+1) and Red ✗ (-1) indicators for question review.
    - Show correct answers and concise AI explanations for every mistake.

---

## Verification Plan

### Manual Verification
1.  **Search**: Upload "Unit 3 Notes". Search "Unit 3". Verify it appears.
2.  **Delete**: Delete a note with a quiz. Verify both are gone from the database.
3.  **Big Questions**: Generate a question. Verify "Full Answer" is long and structured. Download PDF and check format.
4.  **Quiz**: Take a quiz. Answer one wrong. Verify score decreases by 1 and the explanation is shown.
5.  **Study Tracking**: Use the app for 5 minutes. Verify dashboard updates study hours.

### Automated Checks
- Verify `storage_quota_mb` is 2048 for new users.
- Verify `npm uninstall mermaid` was successful.
