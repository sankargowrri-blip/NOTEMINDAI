"""AI Text Refinement — uses Groq (free) or OpenAI, with basic cleanup fallback."""
from __future__ import annotations
import re
import logging
from app.config import settings

logger = logging.getLogger(__name__)


def basic_cleanup(text: str) -> str:
    """Remove stray symbols, extra whitespace, duplicate lines."""
    # Keep printable ASCII + major Unicode scripts (Latin, Devanagari, Tamil, Arabic, CJK)
    text = re.sub(
        r"[^\x20-\x7E\n\t"
        r"\u0900-\u097F"   # Devanagari (Hindi)
        r"\u0B80-\u0BFF"   # Tamil
        r"\u0600-\u06FF"   # Arabic
        r"\u4E00-\u9FFF"   # CJK Unified Ideographs
        r"\u3040-\u30FF"   # Japanese Hiragana/Katakana
        r"\u00C0-\u024F"   # Latin Extended (French, German accents)
        r"]",
        "", text
    )
    text = re.sub(r" {2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    lines = text.splitlines()
    deduped, prev = [], None
    for line in lines:
        stripped = line.strip()
        if stripped != prev:
            deduped.append(line)
        prev = stripped
    return "\n".join(deduped).strip()


def _llm_refine(text: str) -> str:
    """Try Groq first, then OpenAI, return original on failure."""
    if not text.strip():
        return text

    prompt = (
        "You are an expert text editor. This text was extracted from a handwritten note using OCR "
        "and may contain errors. Fix:\n"
        "1. OCR character errors (0/O, 1/l, rn/m etc.)\n"
        "2. Spelling mistakes\n"
        "3. Grammar and punctuation\n"
        "4. Remove duplicate lines and stray symbols\n"
        "5. Preserve technical terms, formulas, code, proper nouns\n"
        "6. Keep paragraph structure and bullet lists\n"
        "Return ONLY the corrected text.\n\n"
        f"OCR TEXT:\n{text[:6000]}"  # limit to avoid token overflow
    )

    # Try Groq (free, fast)
    groq_key = getattr(settings, "groq_api_key", "")
    if groq_key and groq_key.startswith("gsk_"):
        try:
            from groq import Groq
            resp = Groq(api_key=groq_key).chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4096,
                temperature=0.1,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Groq refinement failed: {e}")

    # Try OpenAI fallback
    openai_key = settings.openai_api_key
    if openai_key and openai_key.startswith("sk-") and len(openai_key) > 30:
        try:
            from openai import OpenAI
            resp = OpenAI(api_key=openai_key).chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4096,
                temperature=0.1,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"OpenAI refinement failed: {e}")

    return text  # return cleaned text if no LLM available


def refine_text(raw_ocr_text: str) -> dict:
    """Full refinement: cleanup → LLM correction."""
    if not raw_ocr_text.strip():
        return {"refined_text": "", "corrections": []}
    cleaned = basic_cleanup(raw_ocr_text)
    refined = _llm_refine(cleaned)
    return {"refined_text": refined, "corrections": []}
