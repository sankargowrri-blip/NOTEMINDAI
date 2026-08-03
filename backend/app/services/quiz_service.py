"""Quiz and Flashcard generation — Grounded strictly in note content."""
from __future__ import annotations
import json, re, logging
from app.config import settings

logger = logging.getLogger(__name__)


def _chat(prompt: str, max_tokens: int = 3000) -> str:
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
                            "You are a strict educational content creator. "
                            "You ONLY generate content based on the text provided to you. "
                            "Do NOT use external facts, general knowledge, or outside examples. "
                            "If the text is insufficient, do your best using ONLY what is available."
                        )
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.3,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Groq quiz failed: {e}")

    return "[]"


def generate_quiz(note_text: str, question_type: str = "mcq",
                  difficulty: str = "medium", count: int = 10) -> list[dict]:
    type_instructions = {
        "mcq": "multiple-choice questions with 4 options (A,B,C,D) and one correct answer",
        "fill_blank": "fill-in-the-blank questions",
        "true_false": "true/false questions",
        "one_word": "one-word answer questions",
    }
    q_desc = type_instructions.get(question_type, "questions")
    
    prompt = (
        f"Generate exactly {count} {difficulty}-difficulty {q_desc} based STRICTLY on the note below.\n\n"
        "Rules:\n"
        "1. Every question must be answerable using ONLY the note text.\n"
        "2. Do not use outside knowledge or examples.\n"
        "3. Return a JSON array. Each item must have:\n"
        "   - \"question\": the question text\n"
        "   - \"answer\": the correct answer (from the note)\n"
        "   - \"explanation\": why this is correct (citing the note)\n"
        "   - For MCQ: \"options\": {\"A\":...,\"B\":...,\"C\":...,\"D\":...}\n\n"
        f"NOTE CONTENT:\n{note_text}\n\n"
        "Return ONLY the JSON array. No markdown, no intro text."
    )
    
    raw = _chat(prompt, max_tokens=4000)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"Quiz JSON parse error: {e}")
    return []


def generate_flashcards(note_text: str, card_type: str = "standard",
                        count: int = 20) -> list[dict]:
    prompt = (
        f"Generate exactly {count} flashcards from the note below.\n\n"
        "Rules:\n"
        "1. Use ONLY the information provided in the note.\n"
        "2. Return a JSON array. Each item must have:\n"
        "   - \"front\": A term, concept, or formula name from the note.\n"
        "   - \"back\": The corresponding definition, explanation, or value from the note.\n\n"
        f"NOTE CONTENT:\n{note_text}\n\n"
        "Return ONLY the JSON array."
    )
    
    raw = _chat(prompt, max_tokens=3000)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"Flashcard JSON parse error: {e}")
    return []
