"""Quiz generation and attempt router."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
import json

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.models.quiz import Quiz, QuizAttempt
from app.routers.deps import get_current_user
from app.services.quiz_service import generate_quiz
from app.services.search_tool import search_tool

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
    
    # Hybrid Context: Get web results based on note subject/title
    web_context = ""
    try:
        search_query = f"{note.subject} {note.title}" if note.subject else note.title
        web_results = await search_tool.search(search_query)
        if web_results:
            web_context = json.dumps(web_results)
    except Exception:
        pass # Fallback to note-only if search fails

    questions = generate_quiz(
        note_text=text, 
        web_context=web_context,
        question_type=body.question_type, 
        difficulty=body.difficulty, 
        count=body.count
    )
    
    if not questions:
        raise HTTPException(
            422,
            detail="Could not generate questions. Ensure your Groq API key is set in backend settings."
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
    # The frontend now identifies the 'CorrectKey' based on strict 1-to-1 matching.
    # We maintain this logic here for the DB record.
    for i, q in enumerate(quiz.questions):
        if i < len(body.answers):
            user_ans = str(body.answers[i].get("answer", "")).strip().upper()
            correct_ans = str(q.get("answer", "")).strip().upper()
            
            # Use the same strict logic as frontend to count score
            if user_ans == correct_ans:
                score += 1
            elif q.get("options"):
                # Check if the user sent full text instead of letter
                correct_text = q.get("options", {}).get(correct_ans, "").strip().upper()
                if user_ans == correct_text:
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
