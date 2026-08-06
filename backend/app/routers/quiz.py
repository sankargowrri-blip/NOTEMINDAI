"""Quiz generation and attempt router."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.models.quiz import Quiz, QuizAttempt
from app.routers.deps import get_current_user
from app.services.quiz_service import generate_quiz

router = APIRouter()


class QuizGenerateRequest(BaseModel):
    note_id: int
    question_type: str = "mcq"
    difficulty: str = "medium"
    count: int = Field(default=10, ge=1, le=50)


class QuizSubmitRequest(BaseModel):
    quiz_id: int
    answers: list[dict]


@router.post("/generate", status_code=201)
async def create_quiz(
    body: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Note).where(Note.id == body.note_id, Note.owner_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, detail="Note not found")

    text = note.refined_text or note.raw_ocr_text or ""
    if len(text.strip()) < 50:
        raise HTTPException(422, detail="Note does not have enough content to generate questions.")

    questions = generate_quiz(text, body.question_type, body.difficulty, body.count)
    if not questions:
        raise HTTPException(
            422,
            detail="Could not generate questions. Ensure your Groq API key is set in backend/.env."
        )

    quiz = Quiz(
        note_id=body.note_id,
        owner_id=current_user.id,
        title=f"{note.title} — {body.question_type.upper()} Quiz",
        difficulty=body.difficulty,
        questions=questions,
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    return {"quiz_id": quiz.id, "title": quiz.title, "questions": quiz.questions}


@router.get("/{quiz_id}")
async def get_quiz(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quiz).where(Quiz.id == quiz_id, Quiz.owner_id == current_user.id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(404, detail="Quiz not found")
    return {
        "quiz_id": quiz.id,
        "title": quiz.title,
        "difficulty": quiz.difficulty.value,
        "questions": quiz.questions,
    }


@router.post("/submit")
async def submit_quiz(
    body: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Quiz).where(Quiz.id == body.quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(404, detail="Quiz not found")

    score = 0
    for i, q in enumerate(quiz.questions):
        if i < len(body.answers):
            submitted = str(body.answers[i].get("answer", "")).strip().upper()
            correct = str(q.get("answer", "")).strip().upper()
            
            # Case 1: MCQ with letter answers
            if submitted == correct:
                score += 1
            # Case 2: Fallback - check if submitted text matches the option text
            elif q.get("options"):
                # If user sent 'A' but correct was full text, or vice versa
                opt_text = q.get("options", {}).get(submitted, "").strip().upper()
                if opt_text and opt_text == correct:
                    score += 1
                # Check if correct is a letter and user sent full text
                elif len(correct) == 1 and correct in "ABCD":
                    correct_text = q.get("options", {}).get(correct, "").strip().upper()
                    if submitted == correct_text:
                        score += 1

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=current_user.id,
        note_id=quiz.note_id,
        score=score,
        total=len(quiz.questions),
        answers=body.answers,
    )
    db.add(attempt)
    await db.commit()
    return {
        "score": score,
        "total": len(quiz.questions),
        "percentage": round((score / len(quiz.questions)) * 100, 1) if quiz.questions else 0,
    }
