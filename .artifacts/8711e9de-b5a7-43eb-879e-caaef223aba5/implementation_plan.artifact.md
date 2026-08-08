# Implementation Plan - Quiz Formatting & Stability Fix

The goal is to ensure all quiz types (Fill in the Blanks, True/False, MCQ, Descriptive) follow their correct academic formats and resolve the "AI Busy" (Rate Limit) errors.

## User Review Required

> [!IMPORTANT]
> **Formatting Rules**:
> - **Fill in the Blanks**: Every question will now be guaranteed to have a clear `___` dash placeholder.
> - **True or False**: Questions will be formatted as factual statements (e.g., "NoteMind AI is a study assistant.") with "True" and "False" as the only options.
> - **Stability**: I am further reducing the AI request size to ensure the "AI is busy" (Rate Limit) error stops happening for good.

## Proposed Changes

### 1. Backend: Precision Prompting
- **[MODIFY] [services/quiz_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/quiz_service.py)**:
    - Update `type_instructions` with strict formatting rules:
        - `fill_blank`: "MUST include a '___' placeholder in the question text."
        - `true_false`: "MUST be a statement. Options must be exactly {'A': 'True', 'B': 'False'}."
    - Improve the "Accuracy Handshake" to ensure the AI always picks a correct answer from the provided text.

### 2. Backend: Token & Rate Limit Optimization
- **[MODIFY] [services/quiz_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/quiz_service.py)**:
    - Decrease character limit to **5000 chars** for quiz context to prevent the "6475 requested tokens" error.

### 3. Frontend: Adaptive Rendering
- **[MODIFY] [quiz/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/quiz/page.tsx)**:
    - Ensure the UI handles `options` even for True/False (showing them as big buttons).
    - Add a "Loading" status that explains the AI is reading the notes.

---

## Verification Plan

### Manual Verification
- **Fill-Blank Test**: Generate a Fill-in-the-blank quiz. Verify every question has a `___`.
- **True/False Test**: Generate a True/False quiz. Verify only "True" and "False" options appear.
- **Stress Test**: Generate a quiz for a long note. Verify the "AI Busy" error is gone.
- **Accuracy Test**: Answer a True/False question and verify the Green/Red marks match your choice.

**I am applying these formatting and stability fixes now. Do you want me to proceed?** 🚀🎓📊
