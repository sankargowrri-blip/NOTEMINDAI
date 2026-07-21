"""Translation router."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.routers.deps import get_current_user
from app.services.ai_service import translate_note

router = APIRouter()

SUPPORTED_LANGUAGES = {"ta", "hi", "fr", "de", "ja"}


class TranslateRequest(BaseModel):
    note_id: int
    target_language: str  # ta | hi | fr | de | ja


@router.post("/")
async def translate(
    body: TranslateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(400, detail=f"Unsupported language. Supported: {', '.join(SUPPORTED_LANGUAGES)}")
    r = await db.execute(select(Note).where(Note.id == body.note_id, Note.owner_id == current_user.id))
    note = r.scalar_one_or_none()
    if not note:
        raise HTTPException(404, detail="Note not found")
    text = note.refined_text or note.raw_ocr_text or ""
    if not text:
        raise HTTPException(400, detail="Note has no text to translate")
    translated = translate_note(text, body.target_language)
    return {"original": text, "translated": translated, "target_language": body.target_language}
