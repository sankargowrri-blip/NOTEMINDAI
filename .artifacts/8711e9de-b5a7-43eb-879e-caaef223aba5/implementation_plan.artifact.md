# Implementation Plan - AI Stability & Diagram Accuracy Fix

The goal is to resolve the Groq Rate Limit (Error 413), fix Mermaid diagram syntax errors, and ensure reliable Flashcard/Translation generation.

## User Review Required

> [!IMPORTANT]
> **Token Optimization**: I am implementing a stricter limit on the amount of note text sent to the AI. This will prevent the "Request too large" errors while maintaining enough context for high-quality answers.
> **Mermaid Sanitization**: I will update the AI prompts to ensure Mermaid diagrams use quotes for all node labels. This prevents syntax errors caused by special characters like `()` or `[]` in the text.

## Proposed Changes

### 1. Backend: AI Service Robustness
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Implement a `truncate_text` helper (limit to ~8000 chars) for all AI calls.
    - Add a strict rule for Mermaid diagrams: "Quote all node labels to prevent syntax errors."
- **[MODIFY] [services/quiz_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/quiz_service.py)**:
    - Apply `truncate_text` to flashcard and quiz generation.

### 2. Frontend: Robust Diagram Rendering
- **[MODIFY] [components/Mermaid.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/components/Mermaid.tsx)**:
    - Add a pre-processing step to automatically wrap unquoted labels in double quotes.
    - Improve error state to show a "Reload" option.

### 3. Error Handling Cleanup
- Ensure backend responses are always valid JSON even if AI fails, preventing frontend "failed" toasts.

---

## Verification Plan

### Manual Verification
- **Stress Test**: Ask a question about a very long note to verify truncation works and 413 error is gone.
- **Diagram Test**: Ask for a flowchart with complex names (containing punctuation). Verify it renders correctly.
- **Feature Test**: Generate flashcards for a note that previously failed.
