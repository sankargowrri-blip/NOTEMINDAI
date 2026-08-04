"""AI Assistant router: chat, summary, simplify, keywords, mind map, flowchart."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.routers.deps import get_current_user
from app.services import ai_service
from app.db.mongo import chat_history_collection
import uuid
from datetime import datetime

router = APIRouter()

# ── Models ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    note_id: Optional[int] = None
    session_id: Optional[str] = None

class SummaryRequest(BaseModel):
    note_id: int
    mode: str = "bullet"  # 50_word | 100_word | detailed | bullet | revision

class SimplifyRequest(BaseModel):
    note_id: int
    level: str = "school"  # engineering | school | child

class KeywordsRequest(BaseModel):
    note_id: int

class MindMapRequest(BaseModel):
    note_id: int

class FlowchartRequest(BaseModel):
    note_id: int

class ExamPredictRequest(BaseModel):
    note_id: int
    weak_topics: List[str] = []

class BookmarkRequest(BaseModel):
    session_id: str
    message_content: str
    note_id: Optional[int] = None

# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_note_text(note_id: int, user: User, db: AsyncSession) -> str:
    result = await db.execute(select(Note).where(Note.id == note_id, Note.owner_id == user.id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, detail="Note not found")
    return note.refined_text or note.raw_ocr_text or ""


# ── RAG Chat ──────────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note_text = ""
    if body.note_id:
        note_text = await _get_note_text(body.note_id, current_user, db)
    
    session_id = body.session_id or str(uuid.uuid4())
    history = []
    
    col = chat_history_collection()
    session_data = await col.find_one({"session_id": session_id, "user_id": current_user.id})
    if session_data:
        history = session_data.get("messages", [])

    result = await ai_service.rag_chat(
        user_id=str(current_user.id),
        question=body.question,
        note_text=note_text,
        history=history
    )
    
    new_messages = [
        {"role": "user", "content": body.question},
        {"role": "assistant", "content": result["answer"]}
    ]
    
    await col.update_one(
        {"session_id": session_id, "user_id": current_user.id},
        {
            "$push": {"messages": {"$each": new_messages}},
            "$set": {"updated_at": datetime.utcnow()},
            "$setOnInsert": {"created_at": datetime.utcnow(), "title": body.question[:50]}
        },
        upsert=True
    )
    
    result["session_id"] = session_id
    return result


@router.get("/history")
async def get_history(
    current_user: User = Depends(get_current_user)
):
    col = chat_history_collection()
    cursor = col.find({"user_id": current_user.id}).sort("updated_at", -1)
    sessions = await cursor.to_list(length=20)
    for s in sessions:
        s["_id"] = str(s["_id"])
    return sessions

# ── Bookmarks ─────────────────────────────────────────────────────────────────

@router.post("/bookmarks")
async def add_bookmark(
    body: BookmarkRequest,
    current_user: User = Depends(get_current_user)
):
    from app.db.mongo import get_mongo_db
    col = get_mongo_db()["bookmarks"]
    bookmark = {
        "user_id": current_user.id,
        "session_id": body.session_id,
        "content": body.message_content,
        "note_id": body.note_id,
        "created_at": datetime.utcnow()
    }
    await col.insert_one(bookmark)
    return {"status": "bookmarked"}

@router.get("/bookmarks")
async def get_bookmarks(
    current_user: User = Depends(get_current_user)
):
    from app.db.mongo import get_mongo_db
    col = get_mongo_db()["bookmarks"]
    cursor = col.find({"user_id": current_user.id}).sort("created_at", -1)
    bookmarks = await cursor.to_list(length=50)
    for b in bookmarks:
        b["_id"] = str(b["_id"])
    return bookmarks

# ── Big Questions ─────────────────────────────────────────────────────────────

@router.post("/big-questions")
async def big_questions(
    body: KeywordsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    questions = await ai_service.generate_big_questions(text)
    return {"questions": questions}

# ── Summary ───────────────────────────────────────────────────────────────────

@router.post("/summary")
async def summarise(
    body: SummaryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    if not text:
        raise HTTPException(400, detail="Note has no text content")
    summary = await ai_service.generate_summary(text, mode=body.mode)
    return {"summary": summary, "mode": body.mode}


# ── Simplify ──────────────────────────────────────────────────────────────────

@router.post("/simplify")
async def simplify(
    body: SimplifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    if not text:
        raise HTTPException(400, detail="Note has no text content")
    simplified = await ai_service.simplify_note(text, level=body.level)
    return {"original": text, "simplified": simplified, "level": body.level}


# ── Keywords ──────────────────────────────────────────────────────────────────

@router.post("/keywords")
async def extract_keywords(
    body: KeywordsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    if not text:
        raise HTTPException(400, detail="Note has no text content")
    return await ai_service.extract_keywords(text)


# ── Mind Map ──────────────────────────────────────────────────────────────────

@router.post("/mind-map")
async def mind_map(
    body: MindMapRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    if not text:
        raise HTTPException(400, detail="Note has no text content")
    return await ai_service.generate_mind_map(text)


# ── Flowchart ─────────────────────────────────────────────────────────────────

@router.post("/flowchart")
async def flowchart(
    body: FlowchartRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    if not text:
        raise HTTPException(400, detail="Note has no text content")
    result = await ai_service.generate_flowchart(text)
    if not result.get("nodes"):
        raise HTTPException(422, detail="Could not generate a flowchart. The note may not describe a sequential process.")
    return result


# ── Exam Predictor ────────────────────────────────────────────────────────────

@router.post("/exam-predict")
async def exam_predict(
    body: ExamPredictRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = await _get_note_text(body.note_id, current_user, db)
    topics = await ai_service.predict_exam_topics(text, body.weak_topics)
    return {"predicted_topics": topics}
