# Implementation Plan - Fix SQLAlchemy Mapper Initialization Error

The goal is to resolve the `Mapper[Quiz(quizzes)] has no property 'note'` error by ensuring all bidirectional relationships in the SQLAlchemy models are correctly defined.

## User Review Required

> [!IMPORTANT]
> This fix addresses a critical backend error preventing user registration. It involves adding missing relationship properties to several models to match the `back_populates` definitions in the `Note` model.

## Proposed Changes

### Backend Models

#### [MODIFY] [quiz.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/quiz.py)
- Add `note` relationship to the `Quiz` model.
- Add `note` relationship to the `QuizAttempt` model.
- These will match the `back_populates="note"` used in `Note.quizzes` and `Note.attempts`.

#### [MODIFY] [flashcard.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/flashcard.py)
- Add `note` relationship to the `FlashcardSet` model.
- This will match the `back_populates="note"` used in `Note.flashcard_sets`.

#### [MODIFY] [note.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/note.py)
- Ensure all necessary imports (like `Quiz`, `QuizAttempt`, `FlashcardSet`) are handled correctly, possibly using strings in `relationship()` to avoid circular imports.

## Verification Plan

### Automated Tests
- Since I cannot easily run a full test suite with DB access, I will verify the code syntax and ensure that every `back_populates` has a matching property on the other side.
- I will attempt to trigger a mapper initialization check if possible via a script.

### Manual Verification
- I will ask the user to test the registration flow after the fix is pushed.
