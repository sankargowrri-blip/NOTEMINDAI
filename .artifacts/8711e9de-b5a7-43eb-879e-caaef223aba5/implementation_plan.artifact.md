# Implementation Plan - AI Assistant Upgrade (Diagrams & Global Knowledge)

The goal is to enhance the AI Assistant to provide richer explanations (examples, applications) and visual diagrams (Mermaid.js), while clearing doubts using both uploaded notes and online resources.

## User Review Required

> [!IMPORTANT]
> **Diagram Integration**: I have integrated **Mermaid.js** into the chat interface. You can now ask the assistant to "Draw a flowchart" or "Show a mind map," and it will generate an interactive diagram directly in the chat.
> **Knowledge Source**: The AI is now instructed to use your **Notes first**. If the information is not there, it will automatically search the web (labeled as `[Web]`) to ensure your doubts are always cleared.

## Proposed Changes

### 1. Frontend: Visual Enhancements
- **[MODIFY] [AIChatPage](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/ai-chat/page.tsx)**:
    - Integrated `react-markdown` for better text formatting.
    - Added **Mermaid Diagram rendering** for visual explanations.
    - Updated voice synthesis to automatically skip diagram code blocks (so it doesn't read the code aloud).

### 2. Backend: Intelligence & Diagrams
- **[MODIFY] [ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - **New System Prompt**: Instructed the AI to provide step-by-step guides, practical examples, and Mermaid-based diagrams.
    - **Hybrid Search**: Refined the logic to fall back to the internet more intelligently when notes are insufficient.

---

## Verification Plan

### Manual Verification
- **Diagram Test**: Ask "Explain the machine learning process with a flowchart." Verify a diagram appears.
- **Global Knowledge Test**: Ask a question not in your notes (e.g., "Who is the CEO of Apple?"). Verify it uses `[Web]`.
- **Note Precision**: Ask a question about your specific PDF. Verify it uses `[Notes]`.
- **Voice Sync**: Turn the speaker ON/OFF and verify the AI follows your command.

**The code is ready and the UI is upgraded. Shall I push these final changes to GitHub?**
