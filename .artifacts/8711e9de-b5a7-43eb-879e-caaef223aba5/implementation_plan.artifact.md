# Implementation Plan - Hybrid Quizzes & Precise Evaluation

The goal is to fix the "multiple correct answers" UI bug and implement hybrid quiz generation (Notes + Internet).

## User Review Required

> [!IMPORTANT]
> **Hybrid Quiz Generation**: I will update the quiz engine to automatically search the web for supplementary information related to your note. This ensures the quiz is comprehensive and includes both your specific note points and general domain knowledge from the internet.
> **Precise Evaluation**: I am moving away from "loose matching" for quiz results. The system will now identify exactly **one** correct answer (the intended one) and highlight it in green. Your selection will be red only if it does not match that single correct answer.

## Proposed Changes

### 1. Backend: Hybrid Quiz Service
- **[MODIFY] [services/quiz_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/quiz_service.py)**:
    - Update `generate_quiz` to accept optional `web_context`.
    - Improve prompt to strictly enforce returning the **Letter** (A, B, C, D) as the primary answer format for MCQs.
- **[MODIFY] [routers/quiz.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/quiz.py)**:
    - Before generating, perform a web search based on the note's subject/title to gather "Web Context".
    - Pass this context to the AI to generate a mix of note-based and general questions.

### 2. Frontend: Accurate Quiz UI
- **[MODIFY] [quiz/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/quiz/page.tsx)**:
    - Implement `getCorrectKey` logic to identify the single "Source of Truth" answer.
    - Update the rendering loop to ensure only the `correctKey` is green.
    - Fix the scoring logic to perfectly match the visual indicators.

---

## Verification Plan

### Manual Verification
- **Hybrid Test**: Generate a quiz for a very short note. Verify that the AI generates 10 high-quality questions by pulling extra info from the web.
- **Accuracy Test**: Take a quiz and intentionally get some wrong. Verify:
    - Only 1 green box (the correct one).
    - 1 red box (your wrong choice).
    - Score matches the number of green checks where your choice was correct.
- **Excel/PDF Test**: Verify the exported reports also show this accurate single-answer data.

**I am applying these fixes now to give you a 100% accurate, internet-powered study tool.**
