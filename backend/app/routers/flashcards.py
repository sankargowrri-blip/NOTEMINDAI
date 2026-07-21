"""Flashcard generation router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.models.flashcard import FlashcardSet, FlashcardRecall
from app.routers.deps import get_current_user
from app.services.quiz_service import generate_flashcards

router = APIRouter()


class FlashcardGenerateRequest(BaseModel):
    note_id: int
    card_type: str = "standard"
    count: int = Field(default=20, ge=5, le=100)


class RecallRequest(BaseModel):
    set_id: int
    card_index: int
    known: bool


@router.post("/generate", status_code=201)
async def create_flashcards(
    body: FlashcardGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Note).where(Note.id == body.note_id, Note.owner_id == current_user.id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(404, detail="Note not found")

    text = note.refined_text or note.raw_ocr_text or ""
    cards = generate_flashcards(text, body.card_type, body.count)
    if not cards:
        raise HTTPException(422, detail="Could not generate flashcards from this note.")

    fset = FlashcardSet(
        note_id=body.note_id,
        owner_id=current_user.id,
        title=f"{note.title} — Flashcards",
        card_type=body.card_type,
        cards=cards,
    )
    db.add(fset)
    await db.commit()
    await db.refresh(fset)
    return {"set_id": fset.id, "title": fset.title, "cards": fset.cards, "count": len(cards)}


@router.get("/{set_id}")
async def get_flashcard_set(
    set_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(FlashcardSet).where(FlashcardSet.id == set_id, FlashcardSet.owner_id == current_user.id))
    fset = result.scalar_one_or_none()
    if not fset:
        raise HTTPException(404, detail="Flashcard set not found")
    return {"set_id": fset.id, "title": fset.title, "card_type": fset.card_type.value, "cards": fset.cards}


@router.post("/recall")
async def record_recall(
    body: RecallRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    recall = FlashcardRecall(
        set_id=body.set_id,
        user_id=current_user.id,
        card_index=body.card_index,
        known=body.known,
    )
    db.add(recall)
    await db.commit()
    return {"recorded": True}
