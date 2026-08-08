"""Quiz and Flashcard generation — Grounded in notes + web context with variety logic."""
from __future__ import annotations
import json
import re
import logging
import random
import string
import time
from app.config import settings

logger = logging.getLogger(__name__)

def truncate_text(text: str, max_chars: int = 8000) -> str:
    """Stay within Groq TPM limits by limiting context size."""
    if not text: return ""
    return text[:max_chars] if len(text) > max_chars else text

def _chat(prompt: str, max_tokens: int = 3000, temperature: float = 0.8) -> str:
    """Call AI with high temperature for maximum question variety."""
    groq_key = getattr(settings, "groq_api_key", "")
    if groq_key and groq_key.startswith("gsk_"):
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            resp = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {
                        "role": "system", 
                        "content": (
                            "You are a professional examiner. You generate accurate, diverse, and challenging academic questions. "
                            "You MUST ensure every generation is unique by focusing on different parts of the notes."
                        )
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"AI generation failed: {e}")

    return "[]"


def generate_quiz(note_text: str, web_context: str = "", question_type: str = "mcq",
                  difficulty: str = "medium", count: int = 10) -> list[dict]:
    
    session_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
    
    # Stay under TPM limit
    safe_note_text = truncate_text(note_text, max_chars=8000)
    context_block = f"NOTE CONTENT:\n{safe_note_text}\n\n"
    if web_context:
        context_block += f"ADDITIONAL INTERNET CONTEXT:\n{truncate_text(web_context, 2000)}\n\n"

    prompt = (
        f"Generate exactly {count} {difficulty}-difficulty {question_type} questions based on the context.\n\n"
        "Instructions for 100% Uniqueness & Accuracy:\n"
        f"1. SESSION SEED: {session_id}.\n"
        "2. UNIQUENESS: Do NOT repeat the most obvious or common questions. Find hidden details.\n"
        "3. FORMAT: Return a JSON array. For MCQ, the 'answer' field MUST be just the LETTER ('A', 'B', 'C', or 'D').\n"
        "4. ACCURACY: Ensure the correct answer is clearly supported by the text.\n"
        "5. Structure as JSON list with fields: question, answer, explanation, options (MCQ only).\n\n"
        f"{context_block}"
        "Return ONLY the JSON array."
    )
    
    raw = _chat(prompt, max_tokens=4000, temperature=0.85)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"Quiz parsing error: {e}")
    return []


def generate_flashcards(note_text: str, count: int = 20) -> list[dict]:
    session_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
    safe_note_text = truncate_text(note_text, 8000)
    prompt = (
        f"Generate {count} unique flashcards. Session ID: {session_id}.\n"
        "Return a JSON array with 'front' and 'back' fields.\n\n"
        f"NOTE CONTENT:\n{safe_note_text}\n\n"
        "Return ONLY JSON."
    )
    
    raw = _chat(prompt, max_tokens=3000, temperature=0.7)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"Flashcard parsing error: {e}")
    return []
