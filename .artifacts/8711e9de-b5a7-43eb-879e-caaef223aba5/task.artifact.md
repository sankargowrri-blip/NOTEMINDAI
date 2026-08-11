# Task List - Note Page Count & Full Content Extraction Fix

- `[/]` Backend: Robust Ingestion Pipeline
    - `[ ]` Update `routers/upload.py` with actual page counting and full extraction
    - `[ ]` Update `services/text_refiner.py` to handle large documents in blocks
- `[/]` Backend: AI Feature Optimization
    - `[ ]` Increase context window in `services/ai_service.py` for Big Questions
    - `[ ]` Update `routers/ai_assistant.py` with improved content sufficiency checks
- `[ ]` Data Repair: Reprocess Script
    - `[ ]` Create `scratch/fix_page_counts.py`
    - `[ ]` Execute repair script
- `[ ]` Final Verification
    - `[ ]` Test multi-page PDF upload and metadata
    - `[ ]` Test Big Question generation on large notes
