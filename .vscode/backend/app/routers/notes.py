"""Notes CRUD router."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.routers.deps import get_current_user

router = APIRouter()


class NoteUpdateRequest(BaseModel):
    title: str | None = None
    formatted_text: str | None = None
    subject: str | None = None
    semester: str | None = None
    unit: str | None = None
    chapter: str | None = None
    tags: list[str] | None = None
    is_favourite: bool | None = None


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
    subject: str | None = Query(None),
    semester: str | None = Query(None),
    tag: str | None = Query(None),
    favourite: bool | None = Query(None),
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
        from app.db.vector_store import index_note
        chunks = [c for c in note.formatted_text.split("\n\n") if c.strip()]
        index_note(str(current_user.id), str(note.id), chunks)

    return {"message": "Note updated", "note_id": note.id}


@router.delete("/{note_id}", status_code=204)
async def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Note).where(Note.id == note_id, Note.owner_id == current_user.id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, detail="Note not found")
    await db.delete(note)
    await db.commit()
