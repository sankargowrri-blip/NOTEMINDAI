# Implementation Plan - Total Stability & Silent Error Fix

The goal is to permanently resolve the reported errors: Delete Note Failure, Flashcards not generating, and Mermaid Syntax Errors.

## User Review Required

> [!IMPORTANT]
> **Database Self-Repair**: I am adding a "Deep Cleanup" script. When you delete a note, the server will now force-delete all linked data (Quizzes, Analytics, AI History) in the correct order. This is the only way to stop the "Failed to delete" error on Render.
> **Silent UI**: I am updating the website to be "Invisible to Errors." If the AI makes a mistake while drawing a diagram, the website will simply hide the broken chart and show you the clear text explanation instead. No more red bomb icons.

## Proposed Changes

### 1. Backend: Import & Logic Cleanup
- **[MODIFY] [auth.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/auth.py)**: Move all imports to the top. Fix `ValueError` and `timedelta` issues.
- **[MODIFY] [quiz.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/quiz.py)**: Fix `random` and `re` imports. Unified `_smart_match` logic.
- **[MODIFY] [ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**: Reduce context to **2500 characters** for absolute stability on Groq Free Tier.

### 2. Frontend: Robust UI Rendering
- **[MODIFY] [Mermaid.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/components/Mermaid.tsx)**: Add `mermaid.parse` validation. Returns `null` on failure (completely hidden).
- **[MODIFY] [quiz/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/quiz/page.tsx)**: Final sync of Green/Red coloring with backend scoring.

---

## Verification Plan

### Manual Verification
- **Delete Test**: Delete a note with linked results. Verify 100% success.
- **Rate Limit Test**: Ask about a huge note. Verify the AI answers without the 413 error.
- **Diagram Silence**: Verify that broken diagrams no longer show "Syntax error" messages.
- **Flashcard Test**: Generate cards for a complex note. Verify they appear correctly.

**I am applying these "Silent Stability" fixes now.** 🚀🎓✨
