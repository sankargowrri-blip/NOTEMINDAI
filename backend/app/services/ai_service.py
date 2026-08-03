"""AI service using Groq. Precision-locked to note text (Memory Optimized)."""
from __future__ import annotations
import json, re, logging
from app.config import settings

logger = logging.getLogger(__name__)

def _chat(system: str, user: str, max_tokens: int = 2048) -> str:
    groq_key = getattr(settings, "groq_api_key", "")
    if groq_key and groq_key.startswith("gsk_"):
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            resp = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                max_tokens=max_tokens,
                temperature=0.1, # Lowest randomness for precision
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"AI_ERROR: {e}")
    return "AI_UNAVAILABLE"

def rag_chat(user_id: str, question: str, note_text: str = "") -> dict:
    if not note_text:
        return {"answer": "I don't have access to the note content. Please ensure the note has readable text.", "sources": []}
    
    system = (
        "You are NoteMind AI. Answer ONLY using the note text provided. "
        "If the answer is not in the text, say 'I cannot find that in your notes'. "
        "Do not use your own knowledge."
    )
    user_prompt = f"NOTE TEXT:\n{note_text}\n\nQUESTION: {question}"
    answer = _chat(system, user_prompt)
    return {"answer": answer, "sources": []}

def generate_summary(text: str, mode: str = "bullet") -> str:
    system = "You are a professional note summarizer. Use ONLY the text provided."
    prompt = f"Summarize this text as {mode}: \n\n{text}"
    return _chat(system, prompt)

def extract_keywords(text: str) -> dict:
    system = "You are an extractor. Return JSON ONLY: {\"keywords\":[], \"definitions\":[]}"
    prompt = f"Extract from this text:\n\n{text}"
    raw = _chat(system, prompt)
    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        return json.loads(match.group()) if match else {"keywords":[], "definitions":[]}
    except: return {"keywords":[], "definitions":[]}

def translate_note(text: str, target_language: str) -> str:
    system = f"Translate to {target_language}. Use ONLY the text provided."
    return _chat(system, text)
