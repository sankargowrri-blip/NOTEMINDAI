"""User profile management."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.postgres import get_db
from app.models.user import User
from app.routers.deps import get_current_user
from app.services.auth_service import hash_password

router = APIRouter()


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    profile_photo_url: str | None = None
    password: str | None = None


@router.get("/me")
async def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "profile_photo_url": current_user.profile_photo_url,
        "role": current_user.role.value,
        "is_email_verified": current_user.is_email_verified,
        "storage_quota_mb": current_user.storage_quota_mb,
        "storage_used_mb": current_user.storage_used_mb,
        "created_at": current_user.created_at,
    }


@router.patch("/me")
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.display_name:
        current_user.display_name = body.display_name
    if body.profile_photo_url:
        current_user.profile_photo_url = body.profile_photo_url
    if body.password:
        current_user.hashed_password = hash_password(body.password)
    await db.commit()
    await db.refresh(current_user)
    return {"message": "Profile updated", "display_name": current_user.display_name}
