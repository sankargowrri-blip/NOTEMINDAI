"""AI service using Groq. Precision-locked to note text with Diagram support."""
from __future__ import annotations
import json
import re
import logging
from app.config import settings
from app.services.search_tool import search_tool
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

def truncate_text(text: str, max_chars: int = 3000) -> str:
    """Aggressively limit text to stay under 6000 TPM limit (Free Tier)."""
    if not text: return ""
    return text[:max_chars] + "..." if len(text) > max_chars else text

async def _chat(system: str, user: str, max_tokens: int = 2048, messages: Optional[List[Dict]] = None) -> str:
    """Call Groq using Async client with extreme token optimization."""
    groq_key = settings.groq_api_key
    if groq_key and groq_key.startswith("gsk_"):
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=groq_key)
            
            chat_messages = [{"role": "system", "content": system}]
            if messages:
                # Truncate history to last 2 messages to save tokens
                history = [m for m in messages if m.get("role") != "system"]
                chat_messages.extend(history[-2:]) 
            chat_messages.append({"role": "user", "content": user})
            
            resp = await client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=chat_messages,
                max_tokens=max_tokens,
                temperature=0.3,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"GROQ_ERROR: {str(e)}")
            return f"ERROR: The AI server encountered an issue ({str(e)}). Please check your API usage."
    return "AI_UNAVAILABLE: Your Groq API key is missing. Please add GROQ_API_KEY to your Render Dashboard Environment Variables."

async def rag_chat(user_id: str, question: str, note_text: str = "", history: List[Dict] = None) -> dict:
    """
    Enhanced RAG Chat with strict token management and Diagram Support.
    """
    
    is_web = False
    
    # SYSTEM PROMPT FOR RICH EXPLANATIONS & DIAGRAMS
    system = (
        "You are NoteMind AI, an expert study assistant. Clear any doubt the student has. "
        "1. GROUNDING: Use the provided [NOTE TEXT] first. "
        "2. STRUCTURE: Provide step-by-step explanations and real-world examples. "
        "3. DIAGRAMS: Generate Mermaid.js syntax inside ```mermaid ... ``` ONLY if a diagram is highly helpful. "
        "IMPORTANT: Always wrap node labels in double quotes: id[\"Label text\"]. Do NOT use complex arrows like |> or >>. "
        "4. TONE: Prefix answers with [Notes] or [Web]."
    )
    
    user_prompt = ""
    if note_text and len(note_text.strip()) > 50:
        safe_text = truncate_text(note_text) # 3000 chars max
        user_prompt += f"NOTE TEXT:\n{safe_text}\n\n"
    else:
        is_web = True
    
    # Internet Search Fallback
    should_search = False
    if is_web:
        should_search = True
    else:
        keywords = ["latest", "recent", "who is", "what is the current", "news", "today"]
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
    system = "You are a professional note summarizer."
    safe_text = truncate_text(text)
    prompt = f"Summarize this text as {mode}: \n\n{safe_text}"
    return await _chat(system, prompt)

async def simplify_note(text: str, level: str = "school") -> str:
    system = f"Explain this text like I am a {level} student."
    safe_text = truncate_text(text)
    prompt = f"Text to simplify:\n\n{safe_text}"
    return await _chat(system, prompt)

async def extract_keywords(text: str) -> dict:
    system = "You are an extractor. Return JSON ONLY: {\"keywords\":[], \"definitions\":[]}"
    safe_text = truncate_text(text)
    prompt = f"Extract from this text:\n\n{safe_text}"
    raw = await _chat(system, prompt)
    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        return json.loads(match.group()) if match else {"keywords":[], "definitions":[]}
    except Exception: return {"keywords":[], "definitions":[]}

async def translate_note(text: str, target_language: str) -> str:
    system = f"Translate to {target_language}."
    safe_text = truncate_text(text, max_chars=2000) 
    return await _chat(system, safe_text)

async def generate_big_questions(text: str) -> List[Dict]:
    system = (
        "Generate 3 university-style long questions based on the notes. "
        "Return as JSON list: [{\"question\": \"...\", \"marks\": 15, \"outline\": [\"...\", \"...\"]}]"
    )
    safe_text = truncate_text(text)
    prompt = f"Notes:\n\n{safe_text}"
    raw = await _chat(system, prompt)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        return json.loads(match.group()) if match else []
    except Exception: return []
