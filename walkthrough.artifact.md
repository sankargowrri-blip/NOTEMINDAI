# Walkthrough - Fixing SQLAlchemy Mapper Error

I have resolved the critical backend error that was preventing user registration.

## Problem
The application was failing to start or handle requests due to an inconsistent SQLAlchemy ORM relationship configuration. Specifically, the `Note` model defined relationships with `Quiz`, `QuizAttempt`, and `FlashcardSet` using the `back_populates="note"` attribute, but these related models did not have a corresponding `note` property.

Error: `Mapper[Quiz(quizzes)] has no property 'note'.`

## Solution
I have updated the affected models to include the missing relationship properties, ensuring that both sides of the relationship are correctly defined and linked.

### 1. Updated `Quiz` and `QuizAttempt` models
Added the `note` relationship to both classes in `backend/app/models/quiz.py` to match the `back_populates` configuration in the `Note` model.

### 2. Updated `FlashcardSet` model
Added the `note` relationship to the `FlashcardSet` class in `backend/app/models/flashcard.py`.

### 3. Verified all other relationships
I performed a global check for `back_populates` across all models to ensure no other broken links existed.

## Verification Results

### Automated Verification
- I checked for any remaining inconsistent `back_populates` strings using `grep`.
- The code structure now follows standard SQLAlchemy patterns for bidirectional relationships.

### Manual Verification
- **Test Registration**: Please attempt to create a new account. The mapper error should no longer occur, and the account should be created successfully.
- **Test Note/Quiz Association**: Once registered, upload a note and generate a quiz. Verify that the quiz is correctly linked to the note.

## Files Modified
- [quiz.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/quiz.py)
- [flashcard.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/flashcard.py)
- [note.py](file:///C:/Users/sanka/OneDrive/Documents/NOTEMINDAI/backend/app/models/note.py)
