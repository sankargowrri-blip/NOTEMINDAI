"""Quiz and Flashcard generation — High-variety logic for 120+ students."""
from __future__ import annotations
import json
import re
import logging
import random
import string
import time
from app.config import settings

logger = logging.getLogger(__name__)


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
                temperature=temperature, # High temperature for variety
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"AI generation failed: {e}")

    return "[]"


def generate_quiz(note_text: str, web_context: str = "", question_type: str = "mcq",
                  difficulty: str = "medium", count: int = 10) -> list[dict]:
    
    # 1. Create a unique session seed to force AI variety
    session_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
    current_time = time.time()

    context_block = f"NOTE CONTENT:\n{note_text}\n\n"
    if web_context:
        context_block += f"ADDITIONAL INTERNET CONTEXT:\n{web_context}\n\n"

    prompt = (
        f"Generate exactly {count} {difficulty}-difficulty {question_type} questions based on the context.\n\n"
        "Instructions for 100% Uniqueness & Accuracy:\n"
        f"1. SESSION SEED: {session_id} (Use this to pick different focus areas than before).\n"
        "2. UNIQUENESS: Do NOT repeat the most obvious or common questions. Find hidden details, applications, and edge cases.\n"
        "3. FORMAT: Return a JSON array. For MCQ, the 'answer' field MUST be just the LETTER ('A', 'B', 'C', or 'D').\n"
        "4. ACCURACY: Ensure the correct answer is clearly supported by the text.\n"
        "5. Structure each item as:\n"
        "   - \"question\": the text of the question\n"
        "   - \"answer\": for MCQ use ONE letter. For others, use full correct text.\n"
        "   - \"explanation\": Why this is correct (citing the context)\n"
        "   - \"options\": (MCQ ONLY) {\"A\":...,\"B\":...,\"C\":...,\"D\":...}\n\n"
        f"{context_block}"
        "Return ONLY the JSON array, no conversational text."
    )
    
    raw = _chat(prompt, max_tokens=4000, temperature=0.85) # High temperature for class-wide variety
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"Quiz parsing error: {e}")
    return []


def generate_flashcards(note_text: str, count: int = 20) -> list[dict]:
    session_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
    prompt = (
        f"Generate {count} unique flashcards. Session ID: {session_id}.\n"
        "Return a JSON array with 'front' and 'back' fields.\n\n"
        f"NOTE CONTENT:\n{note_text}\n\n"
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
