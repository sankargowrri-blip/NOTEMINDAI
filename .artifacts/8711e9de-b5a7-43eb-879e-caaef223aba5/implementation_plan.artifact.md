# Implementation Plan - Final Stability & Diagram Silent Fix

The goal is to permanently resolve the Groq "Request too large" (Error 413) and hide the "Syntax error" bomb icons appearing in the AI Assistant.

## User Review Required

> [!IMPORTANT]
> **Aggressive Token Management**: To prevent the 6000 token limit error, I am reducing the amount of note text sent to the AI from 4000 to **2500 characters**. This provides a safe buffer for chat history and web search results.
> **Silent Diagrams**: I am updating the diagram engine to be "Invisible" if a syntax error occurs. Instead of showing a red bomb icon, the broken diagram will be completely hidden, leaving only the AI's text explanation. You will only see a diagram if it is 100% valid.

## Proposed Changes

### 1. Backend: Extreme Token Optimization
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Lower `truncate_text` limit to **2500 characters**.
    - Truncate web search results to the first **1000 characters**.
    - Limit chat history to the **last 2 messages** only.
    - This ensures we stay comfortably under the 6000 token per minute limit.

### 2. Frontend: Silent Diagram Rendering
- **[MODIFY] [components/Mermaid.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/components/Mermaid.tsx)**:
    - Add a strict **Syntax Validator** using `mermaid.parse`.
    - If validation fails, the component will return `null` (rendering nothing).
    - This removes the "Syntax error" messages from your screen.

### 3. Frontend: Smooth Chat Flow
- **[MODIFY] [ai-chat/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/ai-chat/page.tsx)**:
    - Refine the auto-scroll logic to ensure it doesn't "jump" unexpectedly when long answers appear.

---

## Verification Plan

### Manual Verification
- **Stress Test**: Ask a question about a very long note. Verify the AI answers without the "Request too large" error.
- **Diagram Silence Test**: Ask for a "Complex flowchart". Verify that you either see a perfect chart OR just the text answer—**never** the red error box.
- **Scroll Test**: Ensure the chat stays at the bottom when the AI is typing, but allows you to scroll up to read history.

**I am applying these "No-Crash" fixes now. Shall I proceed?** 🚀🎓✨
