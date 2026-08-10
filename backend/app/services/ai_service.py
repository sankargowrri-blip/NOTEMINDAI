"""AI service using Groq. Precision-locked to note text with Diagram support."""
from __future__ import annotations
import json
import re
import logging
from app.config import settings
from app.services.search_tool import search_tool
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

def truncate_text(text: str, max_chars: int = 4000) -> str:
    """Limit text to stay under Groq TPM limits (Free Tier)."""
    if not text: return ""
    return text[:max_chars] + "..." if len(text) > max_chars else text

async def _chat(system: str, user: str, max_tokens: int = 2048, messages: Optional[List[Dict]] = None) -> str:
    """Call Groq using Async client with optimized token usage."""
    groq_key = settings.groq_api_key
    if groq_key and groq_key.startswith("gsk_"):
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=groq_key)
            
            chat_messages = [{"role": "system", "content": system}]
            if messages:
                # Filter out system messages and strictly limit history
                history = [m for m in messages if m.get("role") != "system"]
                chat_messages.extend(history[-2:]) # Only last 2 for extreme safety
            chat_messages.append({"role": "user", "content": user})
            
            resp = await client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=chat_messages,
                max_tokens=max_tokens,
                temperature=0.2,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"GROQ_ERROR: {str(e)}")
            return f"ERROR: The AI server is very busy ({str(e)}). Please wait 30 seconds."
    return "AI_UNAVAILABLE: Groq Key missing."

async def rag_chat(user_id: str, question: str, note_text: str = "", history: List[Dict] = None) -> dict:
    """
    Enhanced RAG Chat with strict token management.
    """
    is_web = False
    system = (
        "You are NoteMind AI. Clear doubts concisely. "
        "1. GROUNDING: Use [NOTE TEXT] first. "
        "2. DIAGRAMS: Generate simple Mermaid syntax ONLY if highly needed. "
        "IMPORTANT: Node labels must use double quotes: id[\"Label\"]. Use standard arrows --> only. "
        "3. TONE: Prefix with [Notes] or [Web]."
    )
    
    user_prompt = ""
    if note_text and len(note_text.strip()) > 50:
        safe_text = truncate_text(note_text, max_chars=4000)
        user_prompt += f"NOTE TEXT:\n{safe_text}\n\n"
    else:
        is_web = True
    
    # Check for web search keywords
    should_search = is_web
    if not should_search:
        keywords = ["latest", "recent", "who is", "what is", "news", "today"]
        if any(word in question.lower() for word in keywords):
            should_search = True

    if should_search:
        web_results = await search_tool.search(question)
        if web_results:
            user_prompt += f"WEB SEARCH RESULTS:\n{json.dumps(web_results)}\n\n"
            is_web = True

    user_prompt += f"QUESTION: {question}"
    answer = await _chat(system, user_prompt, messages=history)
    
    return {
        "answer": answer,
        "sources": ["notes"] if "[Notes]" in answer else (["web"] if is_web else []),
        "is_web": is_web or "[Web]" in answer
    }

async def generate_summary(text: str, mode: str = "bullet") -> str:
    system = "Summarize note content."
    safe_text = truncate_text(text, 4000)
    prompt = f"Summarize as {mode}: \n\n{safe_text}"
    return await _chat(system, prompt)

async def simplify_note(text: str, level: str = "school") -> str:
    system = f"Explain for {level} student."
    safe_text = truncate_text(text, 4000)
    return await _chat(system, safe_text)

async def extract_keywords(text: str) -> dict:
    system = "Return JSON ONLY: {\"keywords\":[], \"definitions\":[]}"
    safe_text = truncate_text(text, 4000)
    raw = await _chat(system, safe_text)
    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        return json.loads(match.group()) if match else {"keywords":[], "definitions":[]}
    except: return {"keywords":[], "definitions":[]}

async def translate_note(text: str, target_language: str) -> str:
    safe_text = truncate_text(text, 3000)
    return await _chat(f"Translate to {target_language}.", safe_text)

async def generate_big_questions(text: str) -> List[Dict]:
    system = "Generate 3 long questions. Return JSON list: [{\"question\":\"...\",\"marks\":15,\"outline\":[...]}]"
    safe_text = truncate_text(text, 4000)
    raw = await _chat(system, safe_text)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        return json.loads(match.group()) if match else []
    except: return []
