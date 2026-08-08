# Implementation Plan - Final AI Stability & Diagram Syntax Fix

The goal is to eliminate the Groq Rate Limit (Error 413) and resolve the visual "Syntax error" in Mermaid diagrams.

## User Review Required

> [!IMPORTANT]
> **Token Optimization**: I am reducing the amount of note text sent to the AI from 8000 to **6000 characters**. This ensures we stay comfortably within Groq's free tier limit (6000 tokens per minute) even with long chat histories.
> **Diagram Accuracy**: I am updating the AI's "Drawing Brain" to use a much simpler and safer Mermaid syntax. It will now wrap every single label in double quotes to prevent syntax errors caused by symbols like `()` or `[]`.

## Proposed Changes

### 1. Backend: AI Service Robustness
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Lower character limit in `truncate_text` to **6000**.
    - Add a strict formatting rule to the system prompt: "MANDATORY: Every node label MUST be in double quotes, e.g., A[\"My Step\"]."
    - Fix the `any()` function reference bug.

### 2. Frontend: Robust Diagram Rendering
- **[MODIFY] [components/Mermaid.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/components/Mermaid.tsx)**:
    - Improve the auto-cleaner to handle malformed Mermaid code more aggressively.
    - Ensure unique IDs are truly unique across long chat sessions.

---

## Verification Plan

### Manual Verification
- **Rate Limit Test**: Ask a question about a long note. Verify the answer is generated without the "Requested 6475" error.
- **Diagram Test**: Ask the assistant to "Show a complex flowchart of a banking app." Verify it renders without the "Syntax error" message.
- **Voice Test**: Ensure the voice still works and doesn't read out the diagram code.

**I am applying these stability fixes now. No action needed on your part until the final deploy.**
