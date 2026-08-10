"""AI service using Groq. Precision-locked to note text with Diagram support."""
from __future__ import annotations
import json
import re
import logging
from app.config import settings
from app.services.search_tool import search_tool
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

def truncate_text(text: str, max_chars: int = 2500) -> str:
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
                # Truncate history to last 2 messages for extreme safety
                history = [m for m in messages if m.get("role") != "system"]
                chat_messages.extend(history[-2:]) 
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
    return "AI_UNAVAILABLE: Your Groq API key is missing. Please add GROQ_API_KEY to your Render Dashboard Environment Variables."

async def rag_chat(user_id: str, question: str, note_text: str = "", history: List[Dict] = None) -> dict:
    """
    Enhanced RAG Chat with strict token management and Diagram Support.
    """
    
    is_web = False
    
    # SYSTEM PROMPT FOR CONCISE EXPLANATIONS & DIAGRAMS
    system = (
        "You are NoteMind AI, an expert study assistant. Your goal is to provide SHORT, DIRECT, and EXAM-FRIENDLY answers. "
        "1. DEFAULT STYLE: Give the direct definition first. Use bullet points for key facts. Avoid long paragraphs. "
        "2. GROUNDING: Use the provided [NOTE TEXT] first. If information is missing, use [WEB SEARCH]. "
        "3. DIAGRAMS: ONLY generate a Mermaid diagram if the user EXPLICITLY asks for one (e.g., 'Draw a flowchart'). "
        "If requested, use valid Mermaid syntax inside triple backticks: ```mermaid ... ```. "
        "IMPORTANT: Always wrap node labels in double quotes: id[\"Label text\"]. "
        "4. TONE: Prefix answers with [Notes] or [Web]. Keep it simple for students."
    )
    
    user_prompt = ""
    if note_text and len(note_text.strip()) > 50:
        safe_text = truncate_text(note_text)
        user_prompt += f"NOTE TEXT:\n{safe_text}\n\n"
    else:
        is_web = True
    
    # Internet Search Fallback
    should_search = is_web
    if not should_search:
        # Check for keywords that trigger web search - using a safe way to avoid linter issues with 'any'
        keywords = ["latest", "recent", "who is", "what is", "news", "today"]
        question_lower = question.lower()
        for word in keywords:
            if word in question_lower:
                should_search = True
                break

    if should_search:
        web_results = await search_tool.search(question)
        if web_results:
            web_str = truncate_text(json.dumps(web_results), max_chars=1000)
            user_prompt += f"WEB SEARCH RESULTS:\n{web_str}\n\n"
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
    safe_text = truncate_text(text, 2500)
    prompt = f"Summarize this text as {mode}: \n\n{safe_text}"
    return await _chat(system, prompt)

async def simplify_note(text: str, level: str = "school") -> str:
    system = f"Explain for {level} student."
    safe_text = truncate_text(text, 2500)
    return await _chat(system, safe_text)

async def extract_keywords(text: str) -> dict:
    system = "Return JSON ONLY: {\"keywords\":[], \"definitions\":[]}"
    safe_text = truncate_text(text, 2500)
    raw = await _chat(system, safe_text)
    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            # Safely parse JSON
            return json.loads(match.group())
        return {"keywords":[], "definitions":[]}
    except Exception: 
        return {"keywords":[], "definitions":[]}

async def translate_note(text: str, target_language: str) -> str:
    safe_text = truncate_text(text, 2000)
    return await _chat(f"Translate to {target_language}.", safe_text)

async def generate_big_questions(text: str) -> List[Dict]:
    system = "Generate 3 long questions. Return JSON list: [{\"question\":\"...\",\"marks\":15,\"outline\":[...]}]"
    safe_text = truncate_text(text, 2500)
    raw = await _chat(system, safe_text)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return []
    except Exception: 
        return []
