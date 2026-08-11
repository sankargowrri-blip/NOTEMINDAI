"""AI Text Refinement — Multi-page block processing for large documents."""
from __future__ import annotations
import re
import logging
import typing
import builtins
from app.config import settings

logger = logging.getLogger(__name__)

def basic_cleanup(text: str) -> str:
    """Remove stray symbols, extra whitespace, duplicate lines."""
    if not text: return ""
    # Keep printable ASCII + major Unicode scripts
    text = re.sub(
        r"[^\x20-\x7E\n\t"
        r"\u0900-\u097F"   # Hindi
        r"\u0B80-\u0BFF"   # Tamil
        r"\u0600-\u06FF"   # Arabic
        r"\u4E00-\u9FFF"   # CJK
        r"\u3040-\u30FF"   # Japanese
        r"\u00C0-\u024F"   # Accents
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


def _llm_refine_block(text: str) -> str:
    """Refine a single block of text using LLM."""
    if not text.strip():
        return text

    prompt = (
        "You are an expert text editor. Fix OCR errors, spelling, and grammar while "
        "preserving all technical terms, formulas, and formatting. Return ONLY corrected text.\n\n"
        f"TEXT BLOCK:\n{text}"
    )

    # Try Groq (Fast & Free)
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
            logger.warning(f"Groq block refinement failed: {e}")

    # Fallback to OpenAI
    openai_key = settings.openai_api_key
    if openai_key and openai_key.startswith("sk-"):
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
            logger.warning(f"OpenAI block refinement failed: {e}")

    return text


def refine_text(raw_ocr_text: str, block_size: int = 6000) -> typing.Dict[str, typing.Any]:
    """Full refinement: cleanup → Block-based LLM correction."""
    if not raw_ocr_text.strip():
        return {"refined_text": "", "corrections": []}
    
    cleaned = basic_cleanup(raw_ocr_text)
    
    # Process in blocks to handle large multi-page notes
    # We increase block size and process more of the document
    blocks = [cleaned[i:i+block_size] for i in builtins.range(0, builtins.len(cleaned), block_size)]
    
    refined_parts = []
    logger.info(f"REFINER: Processing {builtins.len(blocks)} blocks for refinement...")
    
    for i, block in builtins.enumerate(blocks):
        # We refine the first 8 blocks (~48k chars) to handle substantial PDFs
        # This covers roughly 15-20 pages of dense text.
        if i < 8:
            refined_parts.append(_llm_refine_block(block))
        else:
            # For extremely large docs, we still clean but don't use LLM for every block to save time/tokens
            refined_parts.append(block)
            
    return {"refined_text": "\n".join(refined_parts), "corrections": []}
