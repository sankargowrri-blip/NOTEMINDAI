# Implementation Plan - Quiz Accuracy & Excel Export Fix

The goal is to fix the quiz evaluation logic (correct answers being marked wrong), improve the results UI, and add an Excel export feature.

## User Review Required

> [!IMPORTANT]
> **Evaluation Logic**: I am updating the AI prompt to strictly return the **letter** (A, B, C, or D) for multiple-choice answers. I will also update the backend to check both the letter and the full text as a fallback to ensure 100% accuracy.
> **Excel Export**: I will integrate the `xlsx` library on the frontend to allow you to download a detailed report of your quiz results.

## Proposed Changes

### 1. AI Service: Prompt Update
- **[MODIFY] [quiz_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/quiz_service.py)**:
    - Update instructions: "For MCQ, the 'answer' field must contain ONLY the letter of the correct option (e.g., 'A')."

### 2. Backend: Robust Comparison
- **[MODIFY] [routers/quiz.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/quiz.py)**:
    - Add logic to compare user input against both the option letter and the option text.

### 3. Frontend: Results UI & Export
- **[MODIFY] [quiz/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/quiz/page.tsx)**:
    - Add the **Excel Export** button.
    - Improve the score display at the top of the review section.
    - Ensure correct answers are highlighted in **Green** and wrong choices in **Red**.

---

## Verification Plan

### Automated Tests
-   `npm install xlsx` in the frontend.

### Manual Verification
-   **Accuracy Test**: Take an MCQ quiz, select the correct letter, and verify it's marked Green with a 100% score.
-   **Excel Test**: Click "Export to Excel" and verify the downloaded file contains the questions, your answers, and the correct answers.
-   **Visual Test**: Ensure the score "X out of Y" is clearly visible at the top of the results page.

**Shall I proceed with these fixes and the new Excel feature?**
