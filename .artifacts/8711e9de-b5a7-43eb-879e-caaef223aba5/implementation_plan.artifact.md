# Implementation Plan - Fix Note Ingestion & Multi-Page Extraction

The goal is to fix the incorrect "1 page" count and ensure that the full content of multi-page PDFs is extracted and made available to all AI features (especially Big Questions).

## User Review Required

> [!IMPORTANT]
> **Processing Large Documents**: I am increasing the character limit sent to the AI for **Big Questions** from 2,500 to **10,000 characters**. This allows the AI to generate much better 16-mark questions from large notes.
> **Auto-Correction**: I will run a script that automatically fixes all your existing notes that are currently showing "1 page".

## Proposed Changes

### 1. Backend: Robust PDF Ingestion
- **[MODIFY] [routers/upload.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/upload.py)**:
    - Update `_extract_pdf_metadata` to use `doc.page_count` (the official reliable way).
    - Remove the silent fallback to "1 page". If metadata fails, the upload will now log a critical error so we can fix it.
    - Update `_extract_pdf_text_direct` to ensure it loops through EVERY page and combines the text correctly.
- **[MODIFY] [services/text_refiner.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/text_refiner.py)**:
    - Optimize the block-based refinement to ensure large documents are cleaned without losing data.

### 2. Backend: AI Capability Boost
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Increase `max_chars` for `generate_big_questions` to **10,000**.
    - Increase character limit for the main AI Assistant to **6,000**.
- **[MODIFY] [routers/ai_assistant.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/ai_assistant.py)**:
    - Refine the "note too short" check to be more intelligent based on actual text length.

### 3. Data Repair: Standalone Correction Script
- **[NEW] [scratch/reprocess_notes.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/scratch/reprocess_notes.py)**:
    - Create a professional script that:
        1. Connects to the live DB.
        2. Identifies notes with `page_count = 1`.
        3. Re-opens the original files and detects the TRUE page count.
        4. Re-extracts text from all pages.
        5. Updates the database records.

---

## Verification Plan

### Manual Verification
1.  **Upload Test**: Upload a 15-page PDF. Verify "My Notes" shows exactly "15 pages".
2.  **Big Question Test**: Generate questions for a large note. Verify it works perfectly without the "too short" error.
3.  **Search Test**: Search for a word located on page 10 of a PDF. Verify the note is found.
4.  **Repair Verification**: Run the reprocess script and verify the dashboard updates existing notes.
