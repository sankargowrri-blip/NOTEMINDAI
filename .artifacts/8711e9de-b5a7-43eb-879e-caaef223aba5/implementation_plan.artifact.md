# Implementation Plan - Fix Note Page Count & Full Content Extraction

The goal is to fix the incorrect "1 page" count and ensure that NoteMind AI extracts and uses the *entire* content of multi-page documents for all features.

## User Review Required

> [!IMPORTANT]
> **Processing Time**: Processing very large PDFs (50+ pages) may take longer as the system now extracts every single page instead of stopping early.
> **OCR Limits**: For scanned (image) PDFs, I am increasing the processing limit to **50 pages**. Beyond this, it may hit Render's RAM limits. Text-based PDFs remain unlimited.

## Proposed Changes

### 1. Backend: Robust Ingestion Pipeline
- **[MODIFY] [routers/upload.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/upload.py)**:
    - Automatically detect the actual page count of every PDF during upload.
    - Save the detected `page_count` in the database.
    - Ensure `_extract_pdf_text_direct` captures all text across all pages.
- **[MODIFY] [services/text_refiner.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/text_refiner.py)**:
    - Update `_llm_refine` to process text in **6,000-character blocks** if the document is long. This ensures the *whole* note is professionally cleaned, not just the first few paragraphs.

### 2. Backend: AI Feature Optimization
- **[MODIFY] [services/ai_service.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/services/ai_service.py)**:
    - Increase the context window for **Big Questions** to **6,000 characters**. This allows the AI to "see" more of your note and prevents the "Note may be too short" error.
- **[MODIFY] [routers/ai_assistant.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/routers/ai_assistant.py)**:
    - Update the "short note" check to use the total character length of the *full* extracted text.

### 3. Data Repair: Reprocess Script
- **[NEW] [scratch/fix_page_counts.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/scratch/fix_page_counts.py)**:
    - I will create and run a script that scans all your existing notes, detects their true page count from the stored files, re-extracts the full text, and updates the database automatically.

---

## Verification Plan

### Manual Verification
1.  **Upload Test**: Upload a 5-page PDF. Verify "My Notes" displays "5 pages".
2.  **Extraction Test**: Upload a multi-page PDF where a specific keyword only appears on page 4. Search for that keyword. Verify the note is found.
3.  **Big Question Test**: Verify that a 10-page note no longer triggers the "Note too short" error.
4.  **Repair Test**: Verify that old notes showing "1 page" are updated to their correct count after the script runs.
