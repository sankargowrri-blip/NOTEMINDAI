# Implementation Plan - NoteMind AI Total Optimization & Reliability Fix

This plan outlines a comprehensive overhaul of NoteMind AI to ensure all features are stable, accurate, and professional, specifically focusing on removing unwanted diagram features and perfecting the quiz/evaluation system.

## User Review Required

> [!IMPORTANT]
> **Complete Diagram Removal**: As requested, all diagram, flowchart, and mindmap generation features will be completely removed. Mermaid.js will be uninstalled and its rendering components deleted.
> **Quiz Scoring Update**: The quiz marking scheme will change to **+1 for correct**, **-1 for wrong**, and **0 for unanswered**. The final score will be `Total Correct - Total Wrong`.

## Proposed Changes

### 1. Feature Removal (Diagrams & Flowcharts)
- **[DELETE] [Mermaid.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/components/Mermaid.tsx)**: Remove the Mermaid rendering component.
- **[DELETE] [Flowchart.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/components/Flowchart.tsx)**: Remove the legacy flowchart renderer.
- **[MODIFY] [package.json](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/package.json)**: Remove `mermaid` and `react-flow-renderer` dependencies.
- **[MODIFY] [ai-chat/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/ai-chat/page.tsx)**: Remove "Draw a Flowchart" quick prompt and Mermaid markdown rendering.
- **[MODIFY] [notes/[id]/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/notes/[id]/page.tsx)**: Remove Mindmap and Flowchart tabs.

### 2. AI Assistant Optimization (The "Wise Assistant")
- **[MODIFY] [ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - **System Prompt**: Rewrite to enforce extreme conciseness and intent-matching (e.g., "Define" returns ONLY a definition).
    - **No-Diagram Rule**: Explicitly forbid generating Mermaid code or diagrams.
    - **Hybrid Retrieval**: Ensure it prioritizes notes but falls back to web knowledge intelligently to clear all doubts.

### 3. Quiz System Overhaul (The "Professional Examiner")
- **[MODIFY] [routers/quiz.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/quiz.py)**:
    - **Strict Scorer**: Implement the +1/-1 marking logic.
    - **Response Format**: Include counts for correct, wrong, and unanswered questions.
- **[MODIFY] [quiz/page.tsx](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/frontend/src/app/(dashboard)/quiz/page.tsx)**:
    - **Result Page**: Display a detailed summary: Total, Correct, Wrong, Unanswered, Marks, and Percentage.
    - **Question Review**: Use Green ✓ (+1) and Red ✗ (-1) indicators. Show correct answers and explanations for failures.

### 4. Flashcards & Translation Stability
- **[FIX] [routers/flashcards.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/flashcards.py)**: Ensure valid JSON generation from note content only.
- **[FIX] [routers/translate.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/translate.py)**: Ensure only the translated text is returned without conversational filler.

### 5. Backend Reliability & Security
- **[FIX] [notes.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/notes.py)**: Fix cascaded deletion to ensure linked data is cleaned up properly.
- **Ownership**: Verify user ownership for ALL endpoints (Quizzes, Flashcards, History).

---

## Verification Plan

### Automated Tests
- `npm uninstall mermaid react-flow-renderer`
- Monitor backend logs for evaluation accuracy.

### Manual Verification
- **Test 1**: Ask "Define Data Security". Verify a single-sentence response.
- **Test 2**: Take a 10-question quiz. Get 7 right, 2 wrong. Verify score is `7 - 2 = 5 / 10`.
- **Test 3**: Delete a note. Verify it disappears instantly from the UI and DB.
- **Test 4**: Translate a sentence to Tamil. Verify no English text remains.
