"""Notes CRUD router with unified cleanup logic."""
from __future__ import annotations
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete
from pydantic import BaseModel

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.models.quiz import Quiz, QuizAttempt
from app.models.flashcard import FlashcardSet
from app.models.analytics import StudySession, WeakTopic
from app.routers.deps import get_current_user
from app.services.storage_service import delete_file

router = APIRouter()
logger = logging.getLogger("notemind.notes")


class NoteUpdateRequest(BaseModel):
    title: Optional[str] = None
    formatted_text: Optional[str] = None
    subject: Optional[str] = None
    semester: Optional[str] = None
    unit: Optional[str] = None
    chapter: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favourite: Optional[bool] = None


def _note_to_dict(note: Note) -> dict:
    return {
        "id": note.id,
        "title": note.title,
        "status": note.status.value,
        "ocr_confidence": note.ocr_confidence,
        "language": note.language,
        "page_count": note.page_count,
        "file_size_mb": note.file_size_mb,
        "subject": note.subject,
        "semester": note.semester,
        "unit": note.unit,
        "chapter": note.chapter,
        "tags": note.tags,
        "is_favourite": note.is_favourite,
        "original_file_url": note.original_file_url,
        "enhanced_file_url": note.enhanced_file_url,
        "created_at": note.created_at,
        "updated_at": note.updated_at,
    }


@router.get("/")
async def list_notes(
    subject: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    favourite: Optional[bool] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Note).where(Note.owner_id == current_user.id)
    if subject:
        q = q.where(Note.subject == subject)
    if semester:
        q = q.where(Note.semester == semester)
    if favourite is not None:
        q = q.where(Note.is_favourite == favourite)
    q = q.order_by(desc(Note.created_at)).limit(limit).offset(offset)
    result = await db.execute(q)
    notes = result.scalars().all()
    return {"notes": [_note_to_dict(n) for n in notes], "count": len(notes)}


@router.get("/{note_id}")
async def get_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Note).where(Note.id == note_id, Note.owner_id == current_user.id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, detail="Note not found")
    data = _note_to_dict(note)
    data["refined_text"] = note.refined_text
    data["formatted_text"] = note.formatted_text
    data["raw_ocr_text"] = note.raw_ocr_text
    return data


@router.patch("/{note_id}")
async def update_note(
    note_id: int,
    body: NoteUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Note).where(Note.id == note_id, Note.owner_id == current_user.id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, detail="Note not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(note, field, value)
    await db.commit()
    await db.refresh(note)

    # Re-index if text changed
    if body.formatted_text:
        try:
            from app.db.vector_store import index_note
            chunks = [c for c in note.formatted_text.split("\n\n") if c.strip()]
            index_note(str(current_user.id), str(note.id), chunks)
        except Exception:
            pass

    return {"message": "Note updated", "note_id": note.id}


@router.delete("/{note_id}", status_code=204)
async def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unified deletion with manual cleanup of all dependencies."""
    try:
        # 1. Fetch note
        result = await db.execute(select(Note).where(Note.id == note_id, Note.owner_id == current_user.id))
        note = result.scalar_one_or_none()
        if not note:
            raise HTTPException(404, detail="Note not found")

        # 2. Manual Cleanup child records
        await db.execute(delete(QuizAttempt).where(QuizAttempt.note_id == note_id))
        await db.execute(delete(Quiz).where(Quiz.note_id == note_id))
        await db.execute(delete(FlashcardSet).where(FlashcardSet.note_id == note_id))
        await db.execute(delete(StudySession).where(StudySession.note_id == note_id))
        await db.execute(delete(WeakTopic).where(WeakTopic.note_id == note_id))

        # 3. Cleanup AI data
        try:
            from app.db.mongo import notes_collection, versions_collection
            await notes_collection().delete_many({"note_id": note_id})
            await versions_collection().delete_many({"note_id": note_id})
        except Exception:
            pass

        # 4. Storage cleanup
        if note.original_file_url:
            await delete_file(note.original_file_url)
        if note.enhanced_file_url:
            await delete_file(note.enhanced_file_url)

        # 5. Delete note record
        await db.delete(note)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, detail=f"Unable to delete the note: {str(e)}")
