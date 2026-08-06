# Implementation Plan - AI Assistant Voice & Context Refinement

The goal is to strictly link the AI's voice response to the speaker button's state and improve the assistant's ability to use uploaded notes even when no specific note is selected via URL.

## User Review Required

> [!IMPORTANT]
> **Voice Trigger**: I will ensure the AI assistant respects the speaker button for ALL responses. I will also add a **"Replay"** button to each AI message so you can hear the answer again if the speaker was off initially.
> **Context Awareness**: I will add a **Note Selector** directly inside the Chat page. This way, you don't have to go back to "My Notes" to pick a file; you can select it while chatting.

## Proposed Changes

### 1. AI Assistant UI Refinement
- **[MODIFY] [ai-chat/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/ai-chat/page.tsx)**:
    - **Persistence**: Save the speaker button state (On/Off) in the browser memory so it stays how you set it.
    - **Visual Feedback**: Add a "Speaking" pulse animation to the speaker icon when the AI is talking.
    - **Replay Button**: Add a small speaker icon next to each AI message to replay that specific answer.
    - **Note Selector**: Add a dropdown at the top of the chat to select which note the AI should focus on.

### 2. Backend Prompt & Stability
- **[MODIFY] [ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Refine the "Note context" check. If the note text is missing, the AI will now say: "I couldn't find a note selected. Please select a note from the dropdown above so I can help you with your points."
- **[MODIFY] [ai_assistant.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/ai_assistant.py)**:
    - Improve session handling to ensure the note context is preserved across follow-up questions.

---

## Verification Plan

### Manual Verification
- **Speaker Test**: Turn the speaker OFF and ask a question. Verify no audio plays. Turn it ON and ask. Verify audio plays.
- **Replay Test**: Click the "Replay" icon on an old message and verify it speaks.
- **Context Test**: Select a note from the new dropdown and ask "What is this about?". Verify it uses the note content.
- **Mobile Test**: Ensure the new selector and replay buttons look good on a phone screen.

**Shall I proceed with these voice and context improvements?**
