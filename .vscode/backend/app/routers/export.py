"""Export router."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.routers.deps import get_current_user
from app.services.export_service import export_note

router = APIRouter()


@router.get("/{note_id}/{fmt}")
async def export(
    note_id: int,
    fmt: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Note).where(Note.id == note_id, Note.owner_id == current_user.id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, detail="Note not found")
    text = note.formatted_text or note.refined_text or note.raw_ocr_text or ""
    try:
        data, content_type, filename = export_note(note.title, text, fmt)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
