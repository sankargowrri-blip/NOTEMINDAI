"""AI service using Groq (free) with OpenAI fallback. Strictly grounded in note context."""
from __future__ import annotations
import json, re, logging
from app.config import settings
from app.db.vector_store import search_notes

logger = logging.getLogger(__name__)


def _chat(system: str, user: str, max_tokens: int = 2048, temperature: float = 0.2) -> str:
    """Call Groq first, fall back to OpenAI, then return helpful message."""
    # --- Try Groq (free) ---
    groq_key = getattr(settings, "groq_api_key", "")
    if groq_key and groq_key.startswith("gsk_"):
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            resp = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Groq failed: {e}")

    # --- Try OpenAI ---
    openai_key = settings.openai_api_key
    if openai_key and openai_key.startswith("sk-") and len(openai_key) > 30:
        try:
            from openai import OpenAI
            resp = OpenAI(api_key=openai_key).chat.completions.create(
                model="gpt-3.5-turbo-16k",
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"OpenAI failed: {e}")

    return "AI_KEY_MISSING"


def _requires_key(result: str) -> bool:
    return result == "AI_KEY_MISSING"


# ── RAG Chat ──────────────────────────────────────────────────────────────────
def rag_chat(user_id: str, question: str, note_id: str | None = None) -> dict:
    passages = search_notes(user_id, question, n_results=8)
    
    if not passages:
        return {"answer": "I don't have access to your notes right now. Please try uploading them again or wait a moment for the system to index them.", "sources": []}
    
    context = "\n\n---\n\n".join([p["text"] for p in passages])
    
    system = (
        "You are NoteMind AI, a strict study assistant. "
        "Answer the user's question ONLY using the provided note excerpts. "
        "Do NOT use external knowledge. Do NOT make up facts. "
        "If the answer is not contained in the excerpts, say: 'I'm sorry, but I couldn't find that information in your uploaded notes.' "
        "Keep your tone educational, helpful, and concise."
    )
    
    user_prompt = f"NOTE EXCERPTS:\n{context}\n\nQUESTION: {question}"
    answer = _chat(system, user_prompt)
    
    if _requires_key(answer):
        answer = ("AI features are currently unavailable because the API Key is not configured correctly on the server.")
        
    return {"answer": answer, "sources": [p["note_id"] for p in passages]}


# ── Summary ───────────────────────────────────────────────────────────────────
def generate_summary(text: str, mode: str = "bullet") -> str:
    prompts = {
        "50_word":  "Summarise the note below in exactly 50 words or fewer. Use ONLY info from the note.",
        "100_word": "Summarise the note below in exactly 100 words or fewer. Use ONLY info from the note.",
        "detailed": "Write a comprehensive summary of the note below. Cover every key point. Use ONLY info from the note.",
        "bullet":   "Summarise the note below as a structured bulleted list. Each bullet represents a core concept from the note.",
        "revision": "Extract the most exam-relevant information from the note below into a concise revision guide.",
    }
    instruction = prompts.get(mode, prompts["bullet"])
    
    system = "You are a restricted summarisation tool. You only use provided text. No outside knowledge allowed."
    result = _chat(system, f"{instruction}\n\nNOTE CONTENT:\n{text}")
    
    if _requires_key(result):
        return "AI Summary is unavailable. Please check API settings."
    return result


# ── Keywords & Definitions ─────────────────────────────────────────────────────
def extract_keywords(text: str) -> dict:
    system = "You are a data extraction expert. You ONLY extract facts from the provided text."
    prompt = (
        "Analyze the following note content and extract:\n"
        "1. Top 15 keywords found in the text.\n"
        "2. Key terms and their exact definitions from the text.\n"
        "3. Any mathematical formulas present (in LaTeX format).\n"
        "Return ONLY JSON: {\"keywords\":[],\"definitions\":[{\"term\":\"...\",\"definition\":\"...\"}],\"formulas\":[]}\n\n"
        f"NOTE CONTENT:\n{text}"
    )
    raw = _chat(system, prompt, max_tokens=1500, temperature=0.1)
    
    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return {"keywords": [], "definitions": [], "formulas": []}


# ── Translation ───────────────────────────────────────────────────────────────
def translate_note(text: str, target_language: str) -> str:
    lang_names = {"ta": "Tamil", "hi": "Hindi", "fr": "French", "de": "German", "ja": "Japanese"}
    lang_name = lang_names.get(target_language, target_language)
    
    system = f"You are a professional translator. Translate to {lang_name}. Use ONLY the provided text."
    result = _chat(
        system,
        f"Translate this note to {lang_name}. Keep headings, bullets, and LaTeX formulas exactly as they are.\n\nNOTE CONTENT:\n{text}",
        max_tokens=4096, temperature=0.1,
    )
    return result


# ── Exam Predictor ────────────────────────────────────────────────────────────
def predict_exam_topics(text: str, weak_topics: list[str]) -> list[str]:
    weak = ", ".join(weak_topics) if weak_topics else "none"
    system = "You are an AI Exam Coach. You analyze syllabus notes to predict exam topics."
    prompt = (
        f"Based ONLY on the note content below and the student's weak areas ({weak}), predict the top 10 most likely exam topics.\n"
        "Return the result as a simple JSON list of strings. NO extra text.\n\n"
        f"NOTE CONTENT:\n{text}"
    )
    raw = _chat(system, prompt, max_tokens=800, temperature=0.3)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return []
