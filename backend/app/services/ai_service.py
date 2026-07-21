"""AI service using Groq (free) with OpenAI fallback."""
from __future__ import annotations
import json, re, logging
from app.config import settings
from app.db.vector_store import search_notes

logger = logging.getLogger(__name__)


def _chat(system: str, user: str, max_tokens: int = 2048, temperature: float = 0.4) -> str:
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
    passages = search_notes(user_id, question, n_results=6)
    if not passages:
        return {"answer": "No relevant notes found. Please upload some notes first.", "sources": []}
    context = "\n\n---\n\n".join([p["text"] for p in passages])
    system = ("You are NoteMind AI, a helpful study assistant. "
              "Answer ONLY using the note excerpts provided. Be concise and educational.")
    user_prompt = f"NOTE EXCERPTS:\n{context}\n\nQUESTION: {question}"
    answer = _chat(system, user_prompt)
    if _requires_key(answer):
        answer = ("To use AI Chat, add a free Groq API key to backend/.env\n"
                  "Get it free at: https://console.groq.com\n"
                  "Then add: GROQ_API_KEY=gsk_your_key_here")
    return {"answer": answer, "sources": [p["note_id"] for p in passages]}


# ── Summary ───────────────────────────────────────────────────────────────────
SUMMARY_PROMPTS = {
    "50_word":  "Summarise in exactly 50 words or fewer.",
    "100_word": "Summarise in exactly 100 words or fewer.",
    "detailed": "Write a detailed comprehensive summary covering all key points.",
    "bullet":   "Summarise as a structured bullet-point list. Each bullet = one key idea.",
    "revision": "Create a revision summary highlighting the most important exam-relevant concepts.",
}

def generate_summary(text: str, mode: str = "bullet") -> str:
    instruction = SUMMARY_PROMPTS.get(mode, SUMMARY_PROMPTS["bullet"])
    result = _chat("You are an expert educational summariser.", f"{instruction}\n\nNOTE:\n{text}")
    if _requires_key(result):
        # Return a basic extractive summary without AI
        lines = [l.strip() for l in text.splitlines() if len(l.strip()) > 20][:10]
        return "**Key Points (AI not configured):**\n" + "\n".join(f"- {l}" for l in lines)
    return result


# ── Simplifier ────────────────────────────────────────────────────────────────
SIMPLIFY_LEVELS = {
    "engineering": "Keep all technical terms. Make it concise for an engineering student.",
    "school":      "Rewrite for a 15-year-old. Use simple vocabulary and short sentences.",
    "child":       "Rewrite for a 10-year-old. Very simple language, fun analogies, no jargon.",
}

def simplify_note(text: str, level: str = "school") -> str:
    instruction = SIMPLIFY_LEVELS.get(level, SIMPLIFY_LEVELS["school"])
    result = _chat("You are an expert educational writer.", f"{instruction}\n\nNOTE:\n{text}")
    if _requires_key(result):
        return text  # return original if no key
    return result


# ── Keywords ──────────────────────────────────────────────────────────────────
def extract_keywords(text: str) -> dict:
    system = "You are a knowledge extraction expert."
    prompt = (
        "Extract from this note:\n"
        "1. Top 15 keywords (ranked by importance)\n"
        "2. Definition pairs: [{\"term\":...,\"definition\":...}]\n"
        "3. Formulas in LaTeX\n"
        "Return JSON: {\"keywords\":[],\"definitions\":[],\"formulas\":[]}\n\n"
        f"NOTE:\n{text}"
    )
    raw = _chat(system, prompt, max_tokens=1500, temperature=0.2)
    if _requires_key(raw):
        # Basic keyword extraction without AI
        import re
        words = re.findall(r'\b[A-Z][a-z]{3,}\b|\b[a-z]{5,}\b', text)
        freq: dict[str, int] = {}
        for w in words:
            freq[w.lower()] = freq.get(w.lower(), 0) + 1
        keywords = sorted(freq, key=lambda x: -freq[x])[:15]
        return {"keywords": keywords, "definitions": [], "formulas": []}
    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return {"keywords": [], "definitions": [], "formulas": []}


# ── Mind Map ──────────────────────────────────────────────────────────────────
def generate_mind_map(text: str) -> dict:
    system = "You are an expert at creating structured mind maps from educational content."
    prompt = (
        "Create a hierarchical mind map as JSON tree from this note.\n"
        "Format: {\"root\":\"Central Topic\",\"children\":[{\"label\":\"...\",\"children\":[...]}]}\n"
        "Return ONLY valid JSON.\n\n"
        f"NOTE:\n{text}"
    )
    raw = _chat(system, prompt, max_tokens=2000, temperature=0.3)
    if _requires_key(raw):
        # Build basic mind map from headings
        lines = text.splitlines()
        children = [{"label": l.strip("# ").strip(), "children": []}
                    for l in lines if l.startswith("#") or (len(l) > 10 and l == l.upper())][:8]
        return {"root": "Main Topics", "children": children or [{"label": "Upload a note to generate mind map", "children": []}]}
    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return {"root": "Main Topic", "children": []}


# ── Flowchart ─────────────────────────────────────────────────────────────────
def generate_flowchart(text: str) -> dict:
    system = "You are an expert at converting process descriptions into flowchart definitions."
    prompt = (
        "Convert the process/algorithm in this note to a flowchart JSON.\n"
        "Format: {\"nodes\":[{\"id\":\"1\",\"type\":\"start|process|decision|end\",\"label\":\"...\"}],"
        "\"edges\":[{\"from\":\"1\",\"to\":\"2\",\"label\":\"\"}]}\n"
        "Return ONLY valid JSON.\n\n"
        f"NOTE:\n{text}"
    )
    raw = _chat(system, prompt, max_tokens=2000, temperature=0.3)
    if _requires_key(raw):
        return {"nodes": [], "edges": []}
    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return {"nodes": [], "edges": []}


# ── Exam Predictor ────────────────────────────────────────────────────────────
def predict_exam_topics(text: str, weak_topics: list[str]) -> list[str]:
    weak = ", ".join(weak_topics) if weak_topics else "none"
    system = "You are an experienced exam coach."
    prompt = (
        f"Based on this note and weak topics ({weak}), predict top 10 exam topics.\n"
        "Return as JSON list of strings. ONLY JSON.\n\n"
        f"NOTE:\n{text}"
    )
    raw = _chat(system, prompt, max_tokens=800, temperature=0.3)
    if _requires_key(raw):
        return []
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return []


# ── Translation ───────────────────────────────────────────────────────────────
def translate_note(text: str, target_language: str) -> str:
    lang_names = {"ta": "Tamil", "hi": "Hindi", "fr": "French", "de": "German", "ja": "Japanese"}
    lang_name = lang_names.get(target_language, target_language)
    result = _chat(
        f"You are an expert translator. Translate to {lang_name}. Preserve formatting and LaTeX.",
        f"Translate this note to {lang_name}. Keep headings, bullets, tables intact.\n\nNOTE:\n{text}",
        max_tokens=4096, temperature=0.2,
    )
    if _requires_key(result):
        return f"Translation requires an API key.\nGet a free key at: https://console.groq.com\nAdd to backend/.env: GROQ_API_KEY=gsk_..."
    return result
