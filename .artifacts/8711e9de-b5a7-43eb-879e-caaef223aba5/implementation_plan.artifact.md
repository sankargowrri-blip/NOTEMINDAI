# Implementation Plan - Final Stability & Feature Fixes

The goal is to resolve the reported issues with Flashcard generation, Note deletion, and Mermaid diagram syntax errors.

## User Review Required

> [!IMPORTANT]
> **Database Auto-Repair**: I am adding a self-healing script to your server. When you delete a note, the system will now automatically remove all linked quizzes and flashcards. This prevents the "Failed to delete" error.
> **AI Precision**: I have refined the AI's "Drawing Brain" to be even stricter with diagrams. It will now use quotes for all labels to avoid "Syntax Errors."

## Proposed Changes

### 1. Flashcard Generation Fix
- **[MODIFY] [services/quiz_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/quiz_service.py)**:
    - Update `generate_flashcards` to correctly handle `card_type` (Standard, Definition, or Formula). This fixes the "Failed to generate" error.

### 2. Note Deletion (Self-Healing)
- **[MODIFY] [models/quiz.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/quiz.py)**: Add `ondelete="CASCADE"` to the note reference.
- **[MODIFY] [models/flashcard.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/flashcard.py)**: Add `ondelete="CASCADE"` to the note reference.
- **[MODIFY] [db/postgres.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/db/postgres.py)**:
    - Add logic to ensure the production database on Render allows cascading deletes. This is the ultimate fix for the "Failed to delete note" error.

### 3. Diagram Syntax Fix
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Updated the Mermaid prompt: "CRITICAL: Do NOT use symbols like `|>` or `>>`. Use only standard arrows like `-->`. Quote all labels."

---

## Verification Plan

### Manual Verification
1.  **Deletion Test**: Delete a note that has a quiz attached. Verify it disappears instantly.
2.  **Flashcard Test**: Generate "Definition" cards for a note. Verify they appear without error.
3.  **Diagram Test**: Ask for a complex security flowchart. Verify a clean diagram appears.

**I am applying these final stabilization fixes now. Shall I proceed?** 🚀🛠️🎓
