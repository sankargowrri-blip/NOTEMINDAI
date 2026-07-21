"""Quiz and Flashcard generation — uses Groq (free) or OpenAI."""
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
                    {"role": "system", "content": "You are an expert educational content creator."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.5,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Groq quiz failed: {e}")

    # Try OpenAI fallback
    openai_key = settings.openai_api_key
    if openai_key and openai_key.startswith("sk-") and len(openai_key) > 30:
        try:
            from openai import OpenAI
            resp = OpenAI(api_key=openai_key).chat.completions.create(
                model="gpt-3.5-turbo-16k",
                messages=[
                    {"role": "system", "content": "You are an expert educational content creator."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.5,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"OpenAI quiz failed: {e}")

    return "[]"


QUESTION_TYPE_INSTRUCTIONS = {
    "mcq":         "multiple-choice questions with 4 options (A,B,C,D) and one correct answer",
    "fill_blank":  "fill-in-the-blank questions with the answer",
    "true_false":  "true/false questions with the correct answer",
    "one_word":    "one-word answer questions",
    "matching":    "matching questions with two columns",
    "descriptive": "descriptive questions requiring a paragraph answer",
    "viva":        "viva voce questions a professor might ask orally",
    "placement":   "placement/technical interview style questions",
}


def generate_quiz(note_text: str, question_type: str = "mcq",
                  difficulty: str = "medium", count: int = 10) -> list[dict]:
    q_desc = QUESTION_TYPE_INSTRUCTIONS.get(question_type, "questions")
    prompt = (
        f"Generate exactly {count} {difficulty}-difficulty {q_desc} based on this note.\n\n"
        "Return a JSON array. Each item must have:\n"
        "- \"question\": the question text\n"
        "- \"answer\": the correct answer\n"
        "- \"explanation\": a brief explanation\n"
        "For MCQ also include: \"options\": {\"A\":...,\"B\":...,\"C\":...,\"D\":...}\n\n"
        f"NOTE:\n{note_text}\n\n"
        "Return ONLY valid JSON array, no markdown or extra text."
    )
    raw = _chat(prompt, max_tokens=4000)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.warning(f"Failed to parse quiz JSON: {e}")
    return []


def generate_flashcards(note_text: str, card_type: str = "standard",
                        count: int = 20) -> list[dict]:
    type_map = {
        "standard":   "term/definition flashcards",
        "definition": "definition cards (concept and its detailed definition)",
        "formula":    "formula cards (formula name, LaTeX notation, and explanation)",
    }
    card_desc = type_map.get(card_type, "term/definition flashcards")
    prompt = (
        f"Generate exactly {count} {card_desc} from this note.\n\n"
        "Return a JSON array. Each item must have:\n"
        "- \"front\": the front side (term, concept, or formula name)\n"
        "- \"back\": the back side (definition, explanation, or LaTeX formula)\n\n"
        f"NOTE:\n{note_text}\n\n"
        "Return ONLY valid JSON array, no markdown or extra text."
    )
    raw = _chat(prompt, max_tokens=3000)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.warning(f"Failed to parse flashcard JSON: {e}")
    return []
