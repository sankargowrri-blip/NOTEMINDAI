# Task List - Final Stability & Feature Fixes

- `[/]` Fix Flashcard Generation
    - `[ ]` Update `quiz_service.py` to accept `card_type`
- `[/]` Fix Note Deletion (Self-Healing)
    - `[ ]` Update `models/quiz.py` with CASCADE
    - `[ ]` Update `models/flashcard.py` with CASCADE
    - `[ ]` Update `db/postgres.py` with auto-repair migrations
- `[/]` Fix Diagram Syntax
    - `[ ]` Refine Mermaid prompt in `ai_service.py`
- `[ ]` Deploy & Verify
    - `[ ]` Push to GitHub
    - `[ ]` Trigger Render build
