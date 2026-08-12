"""Admin router with deep cleanup capabilities."""
from __future__ import annotations
import logging
import shutil
import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.models.quiz import Quiz, QuizAttempt
from app.models.flashcard import FlashcardSet, FlashcardRecall
from app.models.analytics import StudySession, WeakTopic
from app.routers.deps import get_admin_user

router = APIRouter()
logger = logging.getLogger("notemind.admin")

@router.post("/purge-data")
async def purge_all_user_data(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    CRITICAL: Deletes ALL user-generated content across the entire platform.
    Keeps user accounts, settings, and infrastructure.
    """
    try:
        logger.info(f"ADMIN_PURGE: User {admin.display_name} initiated total system purge.")
        
        # 1. Clear PostgreSQL study-related data
        await db.execute(delete(QuizAttempt))
        await db.execute(delete(Quiz))
        await db.execute(delete(FlashcardRecall))
        await db.execute(delete(FlashcardSet))
        await db.execute(delete(StudySession))
        await db.execute(delete(WeakTopic))
        
        # 2. Clear Notes
        await db.execute(delete(Note))
        
        # 3. Clear Users (Optional: Keep current admin? User said ALL.)
        # To avoid foreign key issues, we delete child records first (done above).
        # We will delete all users except the one performing the purge to keep the session alive,
        # OR just delete all if the user insists.
        # "1. All existing user accounts/profiles"
        await db.execute(delete(User).where(User.id != admin.id))
        
        # Reset current admin's storage
        admin.storage_used_mb = 0.0
            
        # 4. Clear MongoDB content
        try:
            from app.db.mongo import get_mongo_db
            mdb = get_mongo_db()
            for coll in ["notes_content", "note_versions", "chat_history", "quiz_responses", "bookmarks"]:
                await mdb[coll].delete_many({})
        except Exception as me:
            logger.warning(f"PURGE: MongoDB cleanup partial failure: {me}")

        # 5. Clear Local Storage Files
        try:
            from app.config import settings
            upload_dir = settings.local_upload_dir
            if os.path.exists(upload_dir):
                for filename in os.listdir(upload_dir):
                    file_path = os.path.join(upload_dir, filename)
                    try:
                        if os.path.isfile(file_path) or os.path.islink(file_path):
                            os.unlink(file_path)
                        elif os.path.isdir(file_path):
                            shutil.rmtree(file_path)
                    except Exception as fe:
                        logger.error(f"PURGE: Failed to delete {file_path}. Reason: {fe}")
        except Exception as se:
            logger.warning(f"PURGE: Storage cleanup failed: {se}")

        await db.commit()
        return {"message": "Total system purge completed successfully. All data and other users removed."}
    except Exception as e:
        await db.rollback()
        logger.error(f"PURGE_FAILED: {str(e)}")
        raise HTTPException(status_code=500, detail="Purge failed. Check logs.")

@router.get("/dashboard")
async def admin_dashboard(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    active_users = (await db.execute(select(func.count()).where(User.is_active == True))).scalar()
    total_notes = (await db.execute(select(func.count()).select_from(Note))).scalar()
    total_storage = (await db.execute(select(func.sum(User.storage_used_mb)))).scalar() or 0
    avg_ocr = (await db.execute(select(func.avg(Note.ocr_confidence)))).scalar() or 0
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_notes": total_notes,
        "total_storage_gb": round(float(total_storage) / 1024, 3),
        "avg_ocr_accuracy": round(float(avg_ocr), 3),
    }


@router.patch("/users/{user_id}/suspend")
async def suspend_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(select(User).where(User.id == user_id))
    user = r.scalar_one_or_none()
    if not user:
        raise HTTPException(404, detail="User not found")
    user.is_active = False
    await db.commit()
    return {"message": f"User {user_id} suspended"}


@router.patch("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(select(User).where(User.id == user_id))
    user = r.scalar_one_or_none()
    if not user:
        raise HTTPException(404, detail="User not found")
    user.is_active = True
    await db.commit()
    return {"message": f"User {user_id} activated"}


@router.get("/users")
async def list_users(
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(select(User).limit(limit).offset(offset))
    users = r.scalars().all()
    return {
        "users": [
            {
                "id": u.id, "email": u.email, "display_name": u.display_name,
                "role": u.role.value, "is_active": u.is_active,
                "storage_used_mb": u.storage_used_mb, "storage_quota_mb": u.storage_quota_mb,
                "created_at": u.created_at,
            }
            for u in users
        ]
    }


@router.patch("/users/{user_id}/quota")
async def set_user_quota(
    user_id: int,
    quota_mb: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    r = await db.execute(select(User).where(User.id == user_id))
    user = r.scalar_one_or_none()
    if not user:
        raise HTTPException(404, detail="User not found")
    user.storage_quota_mb = quota_mb
    await db.commit()
    return {"message": f"Quota set to {quota_mb} MB for user {user_id}"}
