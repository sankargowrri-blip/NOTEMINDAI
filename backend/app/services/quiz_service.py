"""Quiz and Flashcard generation — Grounded in notes + web context."""
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
                            "You are a professional educational examiner. "
                            "You generate challenging and accurate academic questions. "
                            "Follow JSON instructions perfectly."
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

    prompt = (
        f"Generate exactly {count} {difficulty}-difficulty {q_desc} based on the context provided.\n\n"
        "Instructions:\n"
        "1. Create a mix of questions from the 'NOTE CONTENT' and 'INTERNET CONTEXT'.\n"
        "2. For MCQ: The 'answer' field MUST be exactly one letter: 'A', 'B', 'C', or 'D'.\n"
        "3. Provide a clear 'explanation' for each answer.\n"
        "4. Return a JSON array of objects. Each object must have:\n"
        "   - \"question\": the question text\n"
        "   - \"answer\": the correct answer (LETTER for MCQ, text for others)\n"
        "   - \"explanation\": brief educational explanation\n"
        "   - \"options\": (FOR MCQ ONLY) {\"A\":...,\"B\":...,\"C\":...,\"D\":...}\n\n"
        f"{context_block}"
        "Return ONLY valid JSON array. No extra text."
    )
    
    raw = _chat(prompt, max_tokens=4000)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"Quiz JSON parse error: {e}")
    return []


def generate_flashcards(note_text: str, count: int = 20) -> list[dict]:
    prompt = (
        f"Generate exactly {count} flashcards from the note below.\n\n"
        "Return a JSON array. Each item must have:\n"
        "- \"front\": A term or concept\n"
        "- \"back\": The definition or explanation\n\n"
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
