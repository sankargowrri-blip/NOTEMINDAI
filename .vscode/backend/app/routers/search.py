"""Search router: keyword, semantic, AI-powered."""
from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.routers.deps import get_current_user
from app.db.vector_store import search_notes

router = APIRouter()


@router.get("/")
async def search(
    q: str = Query(..., min_length=1),
    mode: str = Query(default="keyword"),  # keyword | semantic | ai
    subject: str | None = Query(None),
    limit: int = Query(default=10, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if mode == "semantic":
        passages = search_notes(str(current_user.id), q, n_results=limit)
        note_ids = list(dict.fromkeys([p["note_id"] for p in passages]))
        results = []
        for nid in note_ids:
            r = await db.execute(select(Note).where(Note.id == int(nid), Note.owner_id == current_user.id))
            n = r.scalar_one_or_none()
            if n:
                results.append({
                    "id": n.id, "title": n.title, "subject": n.subject,
                    "created_at": n.created_at, "score": next(
                        (p["score"] for p in passages if p["note_id"] == nid), 0
                    ),
                })
        return {"results": results, "mode": "semantic"}

    # Keyword search
    query = select(Note).where(Note.owner_id == current_user.id)
    query = query.where(
        or_(
            Note.title.ilike(f"%{q}%"),
            Note.refined_text.ilike(f"%{q}%"),
            Note.subject.ilike(f"%{q}%"),
        )
    )
    if subject:
        query = query.where(Note.subject == subject)
    query = query.limit(limit)
    result = await db.execute(query)
    notes = result.scalars().all()
    return {
        "results": [{"id": n.id, "title": n.title, "subject": n.subject, "created_at": n.created_at} for n in notes],
        "mode": "keyword",
    }
