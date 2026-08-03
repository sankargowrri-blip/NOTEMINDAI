# Implementation Plan - Fully Functional Note-Locked AI

The goal is to resolve the "Key Missing" error, ensure permanent memory for uploaded notes, and strictly lock the AI responses to the PDF content only.

## Identified Issues
1.  **Groq Key Injection**: The backend is failing to retrieve the `GROQ_API_KEY` from the environment.
2.  **Vector Persistence**: `chroma_db` is local and gets wiped on Render. Notes "disappear" from AI context.
3.  **Prompting**: AI is too broad; needs strict grounding in note text.
4.  **File Size**: 20MB limit is too small for 1GB requirement.

## Proposed Changes

### 1. Persistence (The "Never Forget" Fix)
- **[MODIFY] [vector_store.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/db/vector_store.py)**:
    - Shift to using **MongoDB** as the source of truth for note chunks.
    - Implement a "Re-indexing" check on startup to ensure ChromaDB (in-memory) always has the latest notes from MongoDB.

### 2. Strict AI Logic (The "PDF Only" Fix)
- **[MODIFY] [ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Update `rag_chat` system prompt: "Answer ONLY using the provided note excerpts."
- **[MODIFY] [quiz_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/quiz_service.py)**:
    - Update `generate_quiz` and `generate_flashcards` prompts: "Generate strictly from the provided NOTE text. No outside info."

### 3. File Limits & Config
- **[MODIFY] [upload.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/upload.py)**:
    - Change `MAX_SIZE_MB` to `1024`.
- **[MODIFY] [render.yaml](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/render.yaml)**:
    - Ensure `GROQ_API_KEY` is required.

## Verification Plan
1.  User clicks "Clear Cache and Deploy" on Render.
2.  Verify the Render logs show `DB_LOG: Database tables verified`.
3.  Upload a 50MB+ PDF.
4.  Ask AI Assistant: "What is mentioned on page 1?"
5.  Generate a Quiz; ensure questions match the PDF exactly.
