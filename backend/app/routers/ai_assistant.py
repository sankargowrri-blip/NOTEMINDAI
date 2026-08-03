"""AI Assistant router: chat, summary, simplify, keywords, mind map, flowchart."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.routers.deps import get_current_user
from app.services import ai_service

router = APIRouter()


async def _get_note_text(note_id: int, user: User, db: AsyncSession) -> str:
    result = await db.execute(select(Note).where(Note.id == note_id, Note.owner_id == user.id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, detail="Note not found")
    return note.refined_text or note.raw_ocr_text or ""


# ── RAG Chat ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    note_id: int | None = None


@router.post("/chat")
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note_text = ""
    if body.note_id:
        note_text = await _get_note_text(body.note_id, current_user, db)
    else:
        # Get the latest note text if no specific ID provided
        latest = await db.execute(
            select(Note).where(Note.owner_id == current_user.id).order_by(Note.created_at.desc()).limit(1)
        )
        note = latest.scalar_one_or_none()
        if note:
            note_text = note.refined_text or note.raw_ocr_text or ""

    result = ai_service.rag_chat(
        user_id=str(current_user.id),
        question=body.question,
        note_text=note_text,
    )
    return result


# ── Summary ───────────────────────────────────────────────────────────────────

class SummaryRequest(BaseModel):
    note_id: int
    mode: str = "bullet"  # 50_word | 100_word | detailed | bullet | revision


@router.post("/summary")
async def summarise(
    body: SummaryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    if not text:
        raise HTTPException(400, detail="Note has no text content")
    summary = ai_service.generate_summary(text, mode=body.mode)
    return {"summary": summary, "mode": body.mode}


# ── Simplify ──────────────────────────────────────────────────────────────────

class SimplifyRequest(BaseModel):
    note_id: int
    level: str = "school"  # engineering | school | child


@router.post("/simplify")
async def simplify(
    body: SimplifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    if not text:
        raise HTTPException(400, detail="Note has no text content")
    simplified = ai_service.simplify_note(text, level=body.level)
    return {"original": text, "simplified": simplified, "level": body.level}


# ── Keywords ──────────────────────────────────────────────────────────────────

class KeywordsRequest(BaseModel):
    note_id: int


@router.post("/keywords")
async def extract_keywords(
    body: KeywordsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    if not text:
        raise HTTPException(400, detail="Note has no text content")
    return ai_service.extract_keywords(text)


# ── Mind Map ──────────────────────────────────────────────────────────────────

class MindMapRequest(BaseModel):
    note_id: int


@router.post("/mind-map")
async def mind_map(
    body: MindMapRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    if not text:
        raise HTTPException(400, detail="Note has no text content")
    return ai_service.generate_mind_map(text)


# ── Flowchart ─────────────────────────────────────────────────────────────────

class FlowchartRequest(BaseModel):
    note_id: int


@router.post("/flowchart")
async def flowchart(
    body: FlowchartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    if not text:
        raise HTTPException(400, detail="Note has no text content")
    result = ai_service.generate_flowchart(text)
    if not result.get("nodes"):
        raise HTTPException(422, detail="Could not generate a flowchart. The note may not describe a sequential process.")
    return result


# ── Exam Predictor ────────────────────────────────────────────────────────────

class ExamPredictRequest(BaseModel):
    note_id: int
    weak_topics: list[str] = []


@router.post("/exam-predict")
async def exam_predict(
    body: ExamPredictRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    topics = ai_service.predict_exam_topics(text, body.weak_topics)
    return {"predicted_topics": topics}
