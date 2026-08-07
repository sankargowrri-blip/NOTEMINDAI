"""Quiz generation and attempt router with randomized variety logic."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
import json
import re
import random

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
    
    # Hybrid Context: Randomize search focus to ensure 120 unique student experiences
    web_context = ""
    try:
        foci = ["details", "examples", "exam topics", "applications", "concepts", "fundamentals"]
        search_focus = random.choice(foci)
        search_query = f"{note.subject or ''} {note.title} {search_focus}".strip()
        
        web_results = await search_tool.search(search_query)
        if web_results:
            web_context = json.dumps(web_results)
    except Exception:
        # Fallback to note-only if web search fails
        pass 

    questions = generate_quiz(
        note_text=text, 
        web_context=web_context,
        question_type=body.question_type, 
        difficulty=body.difficulty, 
        count=body.count
    )
    
    if not questions:
        raise HTTPException(422, detail="Could not generate questions. AI is currently busy.")

    quiz = Quiz(
        note_id=body.note_id,
        owner_id=current_user.id,
        title=f"{note.title} — {body.question_type.upper()} Exam",
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


def _smart_match(user_ans: str, correct_ans: str, options: dict | None = None) -> bool:
    """Accurately analyzes correct/incorrect answers across all formats."""
    u = str(user_ans).strip().upper()
    c = str(correct_ans).strip().upper()
    
    # 1. Direct match (A == A)
    if u == c: return True
    
    # 2. Extract letter from AI sentence (e.g. AI said "The answer is A" -> "A")
    clean_correct = re.sub(r'[^A-D]', '', c)[:1]
    if u == clean_correct and u in "ABCD": return True

    # 3. Match user choice (letter) against option text (Full match)
    if options and u in "ABCD":
        opt_text = str(options.get(u, "")).strip().upper()
        # Clean both for fuzzy match
        clean_opt = re.sub(r'^[A-D][.)\s-]+', '', opt_text)
        clean_corr = re.sub(r'^[A-D][.)\s-]+', '', c)
        if clean_opt and (clean_opt == clean_corr or clean_opt in clean_corr):
            return True

    return False


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
            user_ans = body.answers[i].get("answer", "")
            correct_ans = q.get("answer", "")
            
            if _smart_match(user_ans, correct_ans, q.get("options")):
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
