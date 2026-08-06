# Implementation Plan - AI Activation & Diagram Stability

The goal is to fix the `AI_UNAVAILABLE` error (missing API key) and resolve the visual "Syntax error" blocks appearing in the UI.

## User Review Required

> [!IMPORTANT]
> **API Key Setup**: The `AI_UNAVAILABLE` message means your Render server doesn't have your **Groq API Key**. I will update the code to tell you exactly how to fix this in your Render Dashboard.
> **Diagram Fix**: I will update the Mermaid renderer to be more "silent" if it hits an error, so you don't see messy red boxes if the AI is still waking up.

## Proposed Changes

### 1. Backend: AI Diagnostics
- **[MODIFY] [app/main.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/main.py)**:
    - Add a startup log: `INFO: GROQ Key detected: True/False`. This helps us see if Render is passing the key.
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Improve error reporting. Instead of just `AI_UNAVAILABLE`, return a helpful message directing the user to check their environment variables.

### 2. Frontend: Visual Stability
- **[MODIFY] [components/Mermaid.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/components/Mermaid.tsx)**:
    - Use a more unique ID system (using `useId`) to prevent multiple diagrams from clashing.
    - Hide the red error boxes if the diagram is empty or invalid.
- **[MODIFY] [ai-chat/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/ai-chat/page.tsx)**:
    - Add a "Diagnostics Toast": If the server says the key is missing, show a popup with a link to the Render settings.

---

## Verification Plan

### Manual Verification
1.  **Startup Check**: User checks Render Logs for `GROQ Key detected: True`.
2.  **Key Setup**: User adds `GROQ_API_KEY` to Render Dashboard -> Environment.
3.  **Chat Test**: Ask "What is NoteMind AI?". Verify a text response.
4.  **Diagram Test**: Ask "Explain the water cycle with a diagram." Verify a clean chart appears (no red boxes).

**I will push these stability updates now. Please verify your Groq key is set in the Render Dashboard!**
