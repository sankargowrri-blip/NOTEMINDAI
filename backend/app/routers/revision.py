"""Revision planner router — uses Groq (free) or OpenAI."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import date
import json, re, logging

from app.models.user import User
from app.routers.deps import get_current_user
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


class RevisionPlanRequest(BaseModel):
    subjects: list[str]
    exam_date: date
    daily_hours: float = 3.0
    weak_topics: list[str] = []


def _call_llm(prompt: str) -> str:
    # Try Groq first
    groq_key = getattr(settings, "groq_api_key", "")
    if groq_key and groq_key.startswith("gsk_"):
        try:
            from groq import Groq
            resp = Groq(api_key=groq_key).chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=3000,
                temperature=0.4,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Groq revision failed: {e}")

    # OpenAI fallback
    openai_key = settings.openai_api_key
    if openai_key and openai_key.startswith("sk-") and len(openai_key) > 30:
        try:
            from openai import OpenAI
            resp = OpenAI(api_key=openai_key).chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=3000,
                temperature=0.4,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"OpenAI revision failed: {e}")

    return ""


def _basic_plan(subjects: list[str], exam_date: date, daily_hours: float,
                weak_topics: list[str]) -> dict:
    """Fallback: generate a simple plan without AI."""
    from datetime import date as d, timedelta
    days_left = (exam_date - d.today()).days
    plan = []
    day = d.today()
    for i in range(days_left):
        subject = subjects[i % len(subjects)]
        sessions = []
        hours_left = daily_hours
        # Prioritise weak topics
        for wt in weak_topics:
            if hours_left <= 0:
                break
            sessions.append({"subject": subject, "topic": wt, "duration_minutes": 45})
            hours_left -= 0.75
        if hours_left > 0:
            sessions.append({"subject": subject, "topic": f"{subject} - General Revision",
                              "duration_minutes": int(hours_left * 60)})
        plan.append({"date": str(day + timedelta(days=i)), "sessions": sessions})
    return {"plan": plan}


@router.post("/plan")
async def generate_revision_plan(
    body: RevisionPlanRequest,
    current_user: User = Depends(get_current_user),
):
    days_left = (body.exam_date - date.today()).days
    if days_left <= 0:
        raise HTTPException(400, detail="Exam date must be in the future.")
    if not body.subjects:
        raise HTTPException(400, detail="Please provide at least one subject.")

    prompt = (
        f"Create a detailed daily revision plan for a student.\n"
        f"Subjects: {', '.join(body.subjects)}\n"
        f"Weak topics: {', '.join(body.weak_topics) if body.weak_topics else 'none'}\n"
        f"Days until exam: {days_left}\n"
        f"Daily study hours available: {body.daily_hours}\n\n"
        'Return ONLY a JSON object: {"plan": [{"date": "YYYY-MM-DD", '
        '"sessions": [{"subject": "...", "topic": "...", "duration_minutes": 45}]}]}\n'
        "Prioritise weak topics. Distribute subjects evenly across days."
    )

    raw = _call_llm(prompt)
    if raw:
        try:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                result = json.loads(match.group())
                if result.get("plan"):
                    return result
        except Exception as e:
            logger.warning(f"Failed to parse plan JSON: {e}")

    # Fallback to basic plan
    return _basic_plan(body.subjects, body.exam_date, body.daily_hours, body.weak_topics)
