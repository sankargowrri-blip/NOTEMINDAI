"""Authentication router: register, login, refresh, local password reset via security questions."""
from __future__ import annotations
import logging
import re
import json
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr

from app.db.postgres import get_db
from app.models.user import User, UserRole
from app.services.auth_service import (
    hash_password, 
    verify_password, 
    create_access_token, 
    create_refresh_token, 
    decode_token
)
from app.services.email_service import send_reset_password_email
from app.config import settings

router = APIRouter()
logger = logging.getLogger("notemind")


class RegisterRequest(BaseModel):
    email: EmailStr
    display_name: str
    password: str
    role: UserRole = UserRole.student
    security_question: str
    security_answer: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class LocalResetRequest(BaseModel):
    email: EmailStr
    security_answer: str
    new_password: str


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        logger.info(f"REG_ATTEMPT: email={body.email}")
        result = await db.execute(select(User).where(User.email == body.email))
        if result.scalar_one_or_none():
            logger.warning(f"REG_FAILED: Email {body.email} already exists")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        user = User(
            email=body.email,
            display_name=body.display_name,
            hashed_password=hash_password(body.password),
            role=body.role,
            security_question=body.security_question,
            security_answer=body.security_answer.strip().lower(),
            is_email_verified=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info(f"REG_SUCCESS: id={user.id}")
        return {"message": "Registration successful. You can now sign in.", "user_id": user.id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"REG_CRASH: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during registration")


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password or ""):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account suspended")
    access = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh = create_refresh_token({"sub": str(user.id)})
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "display_name": user.display_name, "role": user.role.value},
    }


@router.post("/refresh")
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    from jose import JWTError
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"access_token": access, "token_type": "bearer"}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Fetch the security question for a given email."""
    result = await db.execute(
        select(User).where(func.lower(User.email) == func.lower(body.email))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email.")
    
    # FOR LEGACY USERS (Created before the update):
    # If they have no question set, we provide a temporary fallback question.
    if not user.security_question:
        return {
            "security_question": "LEGACY_USER_RECOVERY", 
            "is_legacy": True,
            "message": "Your account was created before security questions were added. Please register a NEW account for full security, or contact admin."
        }
        
    return {"security_question": user.security_question, "is_legacy": False}


@router.post("/local-reset-password")
async def local_reset_password(body: LocalResetRequest, db: AsyncSession = Depends(get_db)):
    """Verify security answer and reset password immediately."""
    result = await db.execute(
        select(User).where(func.lower(User.email) == func.lower(body.email))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Handle legacy block - prevent lockouts but maintain structure
    if not user.security_answer:
         raise HTTPException(
             status_code=400, 
             detail="This account is from an older version. Please create a new account to use the new security features."
         )

    if user.security_answer != body.security_answer.strip().lower():
        raise HTTPException(status_code=400, detail="Incorrect security answer.")
    
    user.hashed_password = hash_password(body.new_password)
    await db.commit()
    return {"message": "Password reset successful. You can now log in."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    from jose import JWTError
    try:
        payload = decode_token(body.token)
        if payload.get("purpose") != "reset":
            raise HTTPException(status_code=400, detail="Invalid reset token")
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(body.new_password)
    await db.commit()
    return {"message": "Password reset successful"}
