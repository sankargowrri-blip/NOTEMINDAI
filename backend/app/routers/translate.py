"""Translation router with strict accuracy and minimal filler."""
from __future__ import annotations
import logging
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
logger = logging.getLogger("notemind.translate")

# Supported language map (Code to Full Name for AI)
SUPPORTED_LANGUAGES = {
    "ta": "Tamil",
    "hi": "Hindi",
    "de": "German",
    "fr": "French",
    "ja": "Japanese",
    "en": "English"
}


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
        raise HTTPException(status_code=400, detail=f"Unsupported language code: {body.target_language}")
    
    # Verify ownership
    r = await db.execute(select(Note).where(Note.id == body.note_id, Note.owner_id == current_user.id))
    note = r.scalar_one_or_none()
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    text = note.refined_text or note.raw_ocr_text or ""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Note has no readable text to translate.")
    
    try:
        lang_name = SUPPORTED_LANGUAGES[body.target_language]
        logger.info(f"TRANSLATE: Starting {lang_name} translation for note {note.id}")
        
        translated = await translate_note(text, lang_name)
        
        if not translated or "ERROR" in translated:
            raise Exception("AI failed to translate content.")

        return {
            "original_preview": text[:500] + "...", 
            "translated": translated, 
            "target_language": lang_name
        }
    except Exception as e:
        logger.error(f"TRANSLATE_FAILED: {str(e)}")
        raise HTTPException(status_code=500, detail="Translation failed. Please try again later.")
