"""Analytics router."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note
from app.models.quiz import QuizAttempt
from app.models.analytics import StudySession, WeakTopic
from app.routers.deps import get_current_user

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Total notes
    note_count = await db.execute(select(func.count()).where(Note.owner_id == current_user.id))
    total_notes = note_count.scalar() or 0

    # Average OCR confidence
    ocr_avg = await db.execute(
        select(func.avg(Note.ocr_confidence)).where(Note.owner_id == current_user.id)
    )
    avg_ocr = round(float(ocr_avg.scalar() or 0), 3)

    # Total pages
    pages = await db.execute(
        select(func.sum(Note.page_count)).where(Note.owner_id == current_user.id)
    )
    total_pages = int(pages.scalar() or 0)

    # Study hours (last 30 days)
    from datetime import datetime, timedelta, timezone
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    hours = await db.execute(
        select(func.sum(StudySession.duration_minutes))
        .where(StudySession.user_id == current_user.id, StudySession.session_date >= thirty_days_ago)
    )
    study_hours = round(float(hours.scalar() or 0) / 60, 1)

    # Quiz attempts and avg score
    attempts = await db.execute(
        select(QuizAttempt).where(QuizAttempt.user_id == current_user.id)
    )
    all_attempts = attempts.scalars().all()
    avg_quiz_score = 0.0
    if all_attempts:
        scores = [(a.score / a.total * 100) for a in all_attempts if a.total > 0]
        avg_quiz_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    # Weak topics
    weak_result = await db.execute(
        select(WeakTopic).where(WeakTopic.user_id == current_user.id)
    )
    weak_topics = [{"topic": w.topic, "avg_score": w.avg_score} for w in weak_result.scalars().all()]

    # Subjects covered
    subjects_result = await db.execute(
        select(Note.subject).where(Note.owner_id == current_user.id, Note.subject.isnot(None)).distinct()
    )
    subjects = [s for (s,) in subjects_result.all() if s]

    return {
        "total_notes": total_notes,
        "avg_ocr_accuracy": avg_ocr,
        "total_pages_uploaded": total_pages,
        "study_hours_last_30_days": study_hours,
        "avg_quiz_score": avg_quiz_score,
        "quiz_attempts": len(all_attempts),
        "weak_topics": weak_topics,
        "subjects_covered": subjects,
        "storage_used_mb": round(current_user.storage_used_mb or 0, 2),
        "storage_quota_mb": current_user.storage_quota_mb,
    }


@router.post("/session")
async def log_study_session(
    note_id: int,
    duration_minutes: float,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = StudySession(user_id=current_user.id, note_id=note_id, duration_minutes=duration_minutes)
    db.add(session)
    await db.commit()
    return {"logged": True}
