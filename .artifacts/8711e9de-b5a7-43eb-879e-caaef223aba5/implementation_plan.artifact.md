# NoteMind AI Comprehensive Overhaul - Final Implementation Plan

This plan addresses the critical multi-page PDF bug and implements major enhancements for Big Questions, Quizzes, and Storage management.

## User Review Required

> [!IMPORTANT]
> **Scoring Update**: Quizzes now use a **+1 for correct**, **-1 for wrong**, and **0 for skipped** marking scheme.
> **PDF study guides**: Big Question Bank now generates full, exam-ready answers that you can download as professional PDFs.
> **Auto-Correction**: A background task will automatically fix all existing notes that show "1 page" on the first server startup after this update.

## Proposed Changes

### 1. Backend: Multi-Page Extraction & Auto-Repair
- **[MODIFY] [app/main.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/main.py)**:
    - Implement a robust background repair task that correctly counts pages and re-extracts full text for all existing notes.
- **[MODIFY] [routers/upload.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/upload.py)**:
    - Ensure `page_count` is reliably detected and stored for all new uploads.

### 2. Big Question Bank: Full Answers & PDF
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Update AI prompt to generate comprehensive university-level "Full Answers" for every big question.
- **[MODIFY] [BigQuestionsPage](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/flashcards/big-questions/page.tsx)**:
    - Add "Answer Preview" button and modal to display the full exam-ready answer.
    - Implement "Download PDF" functionality with clean academic formatting.

### 3. Quiz System: Professional Marking (+1/-1)
- **[MODIFY] [routers/quiz.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/quiz.py)**:
    - Implement the strict marking logic (+1 for correct, -1 for wrong).
    - Include the logged-in student's name in the result response.
- **[MODIFY] [QuizPage](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/quiz/page.tsx)**:
    - Redesign results to show a detailed marks breakdown, student name, and accuracy.
    - Use Green/Red markers for individual question review with AI explanations.

### 4. Search & Storage Optimization
- **[MODIFY] [routers/search.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/search.py)**:
    - Optimize search to cover Unit/Chapter and full document content.
- **[MODIFY] [DashboardPage](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/dashboard/page.tsx)**:
    - Add a Storage Usage progress bar (Total: 2 GB).

---

## Verification Plan

### Manual Verification
1.  **Upload**: Upload a 10+ page PDF. Verify "10 pages" appears in My Notes.
2.  **Big Questions**: Generate a question, view "Full Answer," and download the PDF.
3.  **Quiz**: Intentionally get an answer wrong. Verify score decreases by 1 and a red ✗ appears.
4.  **Search**: Search for a topic located on page 5 of a multi-page note.
5.  **Auto-Repair**: Check Render logs for "AUTO_FIX" success messages.
