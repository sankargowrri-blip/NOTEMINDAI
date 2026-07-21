"""Admin router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.routers.deps import get_admin_user

router = APIRouter()


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
