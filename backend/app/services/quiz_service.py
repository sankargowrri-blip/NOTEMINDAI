"""Quiz and Flashcard generation — Grounded in notes + web context with variety logic."""
from __future__ import annotations
import json
import re
import logging
import random
import string
from app.config import settings

logger = logging.getLogger(__name__)


def _chat(prompt: str, max_tokens: int = 3000, temperature: float = 0.7) -> str:
    # Try Groq first (free)
    groq_key = getattr(settings, "groq_api_key", "")
    if groq_key and groq_key.startswith("gsk_"):
        try:
            from groq import Groq
            resp = Groq(api_key=groq_key).chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {
                        "role": "system", 
                        "content": (
                            "You are a professional academic examiner. "
                            "You generate challenging, accurate, and diverse academic questions. "
                            "Follow JSON instructions perfectly."
                        )
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Groq quiz failed: {e}")

    return "[]"


def generate_quiz(note_text: str, web_context: str = "", question_type: str = "mcq",
                  difficulty: str = "medium", count: int = 10) -> list[dict]:
    type_instructions = {
        "mcq": "multiple-choice questions with 4 options (A,B,C,D) and one correct answer",
        "fill_blank": "fill-in-the-blank questions",
        "true_false": "true/false questions",
        "one_word": "one-word answer questions",
    }
    q_desc = type_instructions.get(question_type, "questions")
    
    context_block = f"NOTE CONTENT:\n{note_text}\n\n"
    if web_context:
        context_block += f"ADDITIONAL INTERNET CONTEXT:\n{web_context}\n\n"

    # Generate a random seed for variety
    random_token = ''.join(random.choices(string.ascii_letters + string.digits, k=8))

    prompt = (
        f"Generate exactly {count} {difficulty}-difficulty {q_desc} based on the context provided.\n\n"
        "Instructions:\n"
        "1. Create a mix of questions from the 'NOTE CONTENT' and 'INTERNET CONTEXT'.\n"
        "2. VARIETY RULE: Select diverse concepts. Do not repeat the same focus areas. Mix and match definitions, applications, and examples.\n"
        "3. CRITICAL: For MCQ, the 'answer' field MUST be exactly one uppercase letter: 'A', 'B', 'C', or 'D'.\n"
        "4. For MCQ, the correct answer must be one of the four options provided.\n"
        "5. Provide a clear 'explanation' for each answer.\n"
        "6. Return a JSON array of objects. Each object must have:\n"
        "   - \"question\": the question text\n"
        "   - \"answer\": the correct answer (SINGLE LETTER for MCQ, text for others)\n"
        "   - \"explanation\": brief educational explanation\n"
        "   - \"options\": (FOR MCQ ONLY) {\"A\":...,\"B\":...,\"C\":...,\"D\":...}\n\n"
        f"RANDOMNESS SEED: {random_token}\n\n"
        f"{context_block}"
        "Return ONLY valid JSON array. No extra text."
    )
    
    # Using higher temperature (0.8) for better variety among many students
    raw = _chat(prompt, max_tokens=4000, temperature=0.8)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"Quiz JSON parse error: {e}")
    return []


def generate_flashcards(note_text: str, count: int = 20) -> list[dict]:
    random_token = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    prompt = (
        f"Generate exactly {count} flashcards from the note below.\n"
        f"RANDOMNESS SEED: {random_token}\n\n"
        "Return a JSON array. Each item must have:\n"
        "- \"front\": A term or concept\n"
        "- \"back\": The definition or explanation\n\n"
        f"NOTE CONTENT:\n{note_text}\n\n"
        "Return ONLY the JSON array."
    )
    
    raw = _chat(prompt, max_tokens=3000, temperature=0.7)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"Flashcard JSON parse error: {e}")
    return []
