# Implementation Plan - AI Rate Limit & Quiz Feedback

The goal is to fix the Groq Rate Limit error by reducing request size and to enhance the Quiz module with detailed visual feedback (correct/wrong answers).

## User Review Required

> [!IMPORTANT]
> **AI Token Management**: To prevent the "Request too large" error (Error 413), I will truncate the note text sent to the AI to approximately 3000 tokens. This ensures the request stays within the free tier's 6000 TPM limit while still providing enough context for a high-quality answer.
> **Quiz Results**: I am updating the Quiz page so that after you click "Submit", you can see every question again with your answer marked in **Red (if wrong)** or **Green (if correct)**, along with the correct answer and a brief explanation.

## Proposed Changes

### 1. Backend: Token Optimization
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Implement a truncation helper to limit `note_text` to the first ~12,000 characters (approx 3,000 tokens).
    - This prevents the "Requested 6255 tokens" error seen in your screenshot.

### 2. Frontend: Detailed Quiz Results
- **[MODIFY] [quiz/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/quiz/page.tsx)**:
    - Update the "Result" step to display the question list.
    - Add color-coding: Green for correctly answered options, Red for incorrect choices.
    - Show the "Explanation" provided by the AI for each question.

---

## Verification Plan

### Manual Verification
- **Rate Limit Test**: Ask a question about a very long PDF. Verify the AI answers without the "Request too large" error.
- **Quiz Feedback Test**: Complete a quiz with some wrong and some right answers. Verify the results page clearly shows the corrections in Green/Red.
- **Score Verification**: Ensure the "X out of Y" score matches the visual feedback.

**Shall I proceed with these fixes?**
