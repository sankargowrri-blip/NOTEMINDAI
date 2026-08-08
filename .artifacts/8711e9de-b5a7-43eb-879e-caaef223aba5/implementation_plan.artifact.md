# Implementation Plan - Ultimate AI Stability & Silent Diagram Fix

The goal is to permanently resolve the "Request too large" (Error 413) and hide the "Syntax error in text" messages that appear when diagrams fail.

## User Review Required

> [!IMPORTANT]
> **Extreme Token Optimization**: To stop the "AI is busy" error for good, I am reducing the context even further. I will now send the most relevant **3000 characters** (approx 750 tokens) of your note. This ensures that even with chat history, we stay well below the 6000 token limit.
> **Silent Diagrams**: I am updating the diagram engine to be "invisible" if it fails. Instead of showing a big "Syntax error" with a bomb icon, it will simply show the explanation text. You will only see a diagram if it is 100% perfect.

## Proposed Changes

### 1. Backend: Aggressive Token Management
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Reduce `truncate_text` limit to **3000 characters**.
    - Reduce chat history to the **last 2 messages** only.
    - This creates a massive "buffer" so you never hit the 6000 TPM limit again.

### 2. Frontend: Zero-Error Diagram Rendering
- **[MODIFY] [components/Mermaid.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/components/Mermaid.tsx)**:
    - Implement a **Syntax Pre-Check**: The app will now check the diagram code *before* trying to draw it.
    - If the code is invalid, the component will return `null` (completely hidden).
    - This eliminates the "Syntax error in text" messages from your screen.

### 3. Frontend: Scroll & Layout Polish
- **[MODIFY] [ai-chat/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/ai-chat/page.tsx)**:
    - Optimize the "Auto-Scroll" behavior to be smoother when diagrams are being processed.

---

## Verification Plan

### Manual Verification
- **Limit Test**: Ask a question about a 100-page PDF. Verify it answers instantly without Error 413.
- **Diagram Silence Test**: Intentionally ask for a "broken diagram". Verify that the text answer appears but NO red error boxes appear at the bottom.
- **Scroll Test**: Verify the chat doesn't "jump" uncomfortably when the AI responds.

**I am applying these "Silence & Stability" fixes now to make your experience smooth and error-free.** 🚀🎓✨
