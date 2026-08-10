"""Quiz and Flashcard generation — High-variety logic with strict formatting."""
from __future__ import annotations
import json
import re
import logging
import random
import string
import time
from app.config import settings

logger = logging.getLogger(__name__)

def truncate_text(text: str, max_chars: int = 5000) -> str:
    """Stay strictly within free-tier TPM limits by limiting context size."""
    if not text: return ""
    return text[:max_chars] + "..." if len(text) > max_chars else text

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
                            "You are a professional academic examiner. You follow strict formatting rules for quizzes and flashcards. "
                            "You generate challenging, accurate, and diverse academic material. No diagrams or Mermaid code."
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
    
    type_rules = {
        "mcq": "Multiple-choice questions with 4 options (A,B,C,D). The 'answer' field MUST be just the LETTER ('A', 'B', 'C', or 'D').",
        "fill_blank": "Fill-in-the-blank questions. The 'question' field MUST include a '___' (underscore dash) as a placeholder for the answer.",
        "true_false": "True or False statements. The 'question' MUST be a statement. 'options' MUST be exactly {'A': 'True', 'B': 'False'}. The 'answer' MUST be 'A' or 'B'.",
        "one_word": "Questions where the answer is exactly one word.",
        "descriptive": "Long-answer/explanatory questions.",
    }
    format_rule = type_rules.get(question_type, "Standard academic questions.")

    session_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
    
    safe_note_text = truncate_text(note_text, max_chars=5000)
    context_block = f"NOTE CONTENT:\n{safe_note_text}\n\n"
    if web_context:
        context_block += f"INTERNET CONTEXT:\n{truncate_text(web_context, 1000)}\n\n"

    prompt = (
        f"Generate exactly {count} {difficulty}-difficulty {question_type} questions based on the context.\n\n"
        "STRICT FORMATTING RULES:\n"
        f"1. TYPE: {format_rule}\n"
        f"2. SESSION SEED: {session_id}.\n"
        "3. FORMAT: Return a JSON array. Each object MUST have: \"question\", \"answer\", \"explanation\".\n"
        "4. For MCQ & True/False, also include \"options\": {}.\n"
        "5. NO extra text, NO markdown formatting outside the JSON block.\n\n"
        f"{context_block}"
        "Return ONLY the JSON array."
    )
    
    raw = _chat(prompt, max_tokens=4000, temperature=0.8)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"Quiz parsing error: {e}")
    return []


def generate_flashcards(note_text: str, card_type: str = "standard", count: int = 20) -> list[dict]:
    """Generates unique flashcards from note content."""
    session_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
    safe_text = truncate_text(note_text, 5000)
    
    type_prompts = {
        "standard": "key terms and high-level concepts",
        "definition": "precise definitions of technical vocabulary",
        "formula": "mathematical or scientific formulas and their applications"
    }
    focus = type_prompts.get(card_type, "key points")

    prompt = (
        f"Generate exactly {count} unique flashcards focusing on {focus}.\n"
        f"Session ID: {session_id}.\n"
        "Instructions:\n"
        "1. Return a JSON array of objects.\n"
        "2. Each object MUST have 'front' and 'back' fields.\n"
        "3. Focus on unique details from the note below.\n"
        "4. No diagrams, no Mermaid, no conversational text.\n\n"
        f"NOTE CONTENT:\n{safe_text}\n\n"
        "Return ONLY JSON array."
    )
    
    raw = _chat(prompt, max_tokens=3000, temperature=0.7)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"Flashcard parsing error: {e}")
    return []
