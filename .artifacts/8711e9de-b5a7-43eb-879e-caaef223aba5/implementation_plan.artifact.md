# Implementation Plan - NoteMind AI Mega Upgrade

This plan outlines the transformation of NoteMind AI into a full-scale AI Study Platform with Voice interaction, Internet-augmented intelligence, and a fully responsive professional UI.

## User Review Required

> [!IMPORTANT]
> **External Search API**: To enable internet-enhanced search, we will need to integrate a search tool (e.g., **Tavily** or **DuckDuckGo API**). Tavily is recommended for educational accuracy.
> **Voice Implementation**: I will use the **Web Speech API** for STT (Speech-to-Text) and TTS (Text-to-Speech) as it works natively in browsers without extra server costs.

## Proposed Changes

### 1. Database & Backend Models
- **[NEW] [models/chat.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/chat.py)**: Define `ChatSession`, `ChatMessage`, and `Bookmark` models.
- **[MODIFY] [models/user.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/user.py)**: Add relationships to chat history.

### 2. AI Service & Internet Intelligence
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Integrate hybrid search (Vector Store + Web Search).
    - Update prompt engineering for "Step-by-step", "Interview Qs", and "Exam Tips".
- **[NEW] [services/search_tool.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/search_tool.py)**: Handle web retrieval.

### 3. Voice AI System
- **[MODIFY] [ai-chat/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/ai-chat/page.tsx)**:
    - Implement `SpeechRecognition` for input.
    - Implement `SpeechSynthesis` for output.
    - Add voice control buttons (Start/Stop/Replay).
    - Add waveform animation using CSS/Canvas.

### 4. Big Question Bank & Flashcards
- **[NEW] [flashcards/big-questions/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/flashcards/big-questions/page.tsx)**: Create the long-answer revision section.
- **[MODIFY] [services/quiz_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/quiz_service.py)**: Add logic for generating 10-16 mark questions with structured outlines.

### 5. Responsive UI & Theming
- **[MODIFY] [Sidebar.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/components/Sidebar.tsx)**: Implement a mobile-first drawer using Headless UI or Radix.
- **[MODIFY] [layout.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/layout.tsx)**: Add mobile navigation bar for small screens.
- **[MODIFY] [globals.css](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/globals.css)**: Implement Dark/Light mode theme variables.

---

## Verification Plan

### Automated Tests
-   Verify backend endpoint for chat history: `GET /api/ai/history`.
-   Verify web search fallback in `ai_service.py`.

### Manual Verification
-   **Mobile Test**: Use Chrome DevTools to verify all pages work on iPhone/Android sizes.
-   **Voice Test**: Click the mic, speak a question, and verify the AI speaks back.
-   **AI Accuracy**: Upload a note and verify the "Big Question Bank" uses note content.
