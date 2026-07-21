"""Collaboration router: share notes, comments, version history."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timezone

from app.db.mongo import versions_collection
from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.routers.deps import get_current_user

router = APIRouter()


class ShareRequest(BaseModel):
    note_id: int
    email: str
    access: str = "view"  # view | edit


class CommentRequest(BaseModel):
    note_id: int
    text: str


@router.post("/share")
async def share_note(
    body: ShareRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify ownership
    r = await db.execute(select(Note).where(Note.id == body.note_id, Note.owner_id == current_user.id))
    note = r.scalar_one_or_none()
    if not note:
        raise HTTPException(404, detail="Note not found")
    # In production: create a share record in DB and send email
    return {"shared": True, "note_id": body.note_id, "email": body.email, "access": body.access}


@router.post("/comment")
async def add_comment(
    body: CommentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    col = versions_collection()
    comment_doc = {
        "type": "comment",
        "note_id": body.note_id,
        "user_id": current_user.id,
        "display_name": current_user.display_name,
        "text": body.text,
        "created_at": datetime.now(timezone.utc),
    }
    result = await col.insert_one(comment_doc)
    return {"comment_id": str(result.inserted_id), "created": True}


@router.get("/comments/{note_id}")
async def get_comments(
    note_id: int,
    current_user: User = Depends(get_current_user),
):
    col = versions_collection()
    cursor = col.find({"type": "comment", "note_id": note_id})
    comments = []
    async for doc in cursor:
        comments.append({
            "id": str(doc["_id"]),
            "user_id": doc.get("user_id"),
            "display_name": doc.get("display_name"),
            "text": doc.get("text"),
            "created_at": doc.get("created_at"),
        })
    return {"comments": comments}


@router.post("/version/save")
async def save_version(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(select(Note).where(Note.id == note_id, Note.owner_id == current_user.id))
    note = r.scalar_one_or_none()
    if not note:
        raise HTTPException(404, detail="Note not found")
    col = versions_collection()
    version_doc = {
        "type": "version",
        "note_id": note_id,
        "author_id": current_user.id,
        "author_name": current_user.display_name,
        "content": note.formatted_text,
        "saved_at": datetime.now(timezone.utc),
    }
    result = await col.insert_one(version_doc)
    return {"version_id": str(result.inserted_id)}


@router.get("/versions/{note_id}")
async def list_versions(
    note_id: int,
    current_user: User = Depends(get_current_user),
):
    col = versions_collection()
    cursor = col.find({"type": "version", "note_id": note_id}).sort("saved_at", -1).limit(50)
    versions = []
    async for doc in cursor:
        versions.append({
            "version_id": str(doc["_id"]),
            "author_name": doc.get("author_name"),
            "saved_at": doc.get("saved_at"),
        })
    return {"versions": versions}
