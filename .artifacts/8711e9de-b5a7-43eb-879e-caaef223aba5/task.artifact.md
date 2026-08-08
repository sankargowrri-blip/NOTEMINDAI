# Task List - Final Stability & Feature Fixes

- `[x]` Fix Flashcard Generation
    - `[x]` Update `quiz_service.py` to accept `card_type`
- `[x]` Fix Note Deletion (Self-Healing)
    - `[x]` Update `models/quiz.py` with CASCADE
    - `[x]` Update `models/flashcard.py` with CASCADE
    - `[x]` Update `db/postgres.py` with auto-repair migrations
- `[x]` Fix Diagram Syntax
    - `[x]` Refine Mermaid prompt in `ai_service.py`
- `[x]` Deploy & Verify
    - `[x]` Push to GitHub
    - `[x]` Trigger Render build
