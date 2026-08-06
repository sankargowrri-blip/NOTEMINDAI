"""Quiz generation and attempt router."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
import json
import re

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
    
    # Hybrid Context
    web_context = ""
    try:
        search_query = f"{note.subject} {note.title}" if note.subject else note.title
        web_results = await search_tool.search(search_query)
        if web_results:
            web_context = json.dumps(web_results)
    except Exception:
        pass

    questions = generate_quiz(
        note_text=text, 
        web_context=web_context,
        question_type=body.question_type, 
        difficulty=body.difficulty, 
        count=body.count
    )
    
    if not questions:
        raise HTTPException(422, detail="Could not generate questions.")

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


def _normalize(text: str) -> str:
    """Helper to strip punctuation and case for robust matching."""
    if not text: return ""
    return re.sub(r'^[A-D][.)\s-]+', '', str(text)).strip().upper()


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
            user_ans = str(body.answers[i].get("answer", "")).strip().upper()
            correct_ans = str(q.get("answer", "")).strip().upper()
            
            # 1. Direct match (A == A)
            if user_ans == correct_ans:
                score += 1
                continue
            
            # 2. Normalize and check letter (e.g. AI said "A." but user sent "A")
            clean_correct = re.sub(r'[^A-D]', '', correct_ans)[:1]
            if user_ans == clean_correct and user_ans in "ABCD":
                score += 1
                continue

            # 3. Text match fallback (If correct answer was the full string)
            if q.get("options"):
                opt_text = str(q.get("options", {}).get(user_ans, "")).strip().upper()
                if opt_text and (opt_text == correct_ans or _normalize(opt_text) == _normalize(correct_ans)):
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
