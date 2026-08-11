"""AI service using Groq. Precision-locked to note text (Memory Optimized)."""
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
    return "AI_UNAVAILABLE: Your Groq API key is missing."

async def rag_chat(user_id: str, question: str, note_text: str = "", history: List[Dict] = None) -> dict:
    """
    Enhanced RAG Chat with strict token management.
    """
    is_web = False
    system = (
        "You are NoteMind AI, an expert study assistant. Answer questions ACCURATELY and DIRECTLY. "
        "1. INTENT MATCHING: Understand the user's intent. "
        "   - 'Define...': Provide ONLY the definition. No extra text. "
        "   - 'What is...': Provide a direct, concise answer. "
        "   - 'List...': Provide the requested list as bullet points. "
        "   - 'Difference between...': Use a comparison table. "
        "   - 'Explain...': Provide a clear, moderate explanation. "
        "   - 'Explain in detail...': Provide a comprehensive, structured answer. "
        "   - 'X mark answer...': Match the length to the mark level (2 marks = very short, 16 marks = long and structured). "
        "2. GROUNDING: Use the provided [NOTE TEXT] first. If information is missing, use [WEB SEARCH]. "
        "3. NO DIAGRAMS: Do NOT generate Mermaid code, flowcharts, or diagrams. "
        "4. TONE: Professional, educational, and extremely concise by default. Do not add unnecessary filler."
    )
    
    user_prompt = ""
    if note_text and len(note_text.strip()) > 50:
        # Chat can handle more context now with optimized history
        safe_text = truncate_text(note_text, max_chars=4000)
        user_prompt += f"NOTE TEXT:\n{safe_text}\n\n"
    else:
        is_web = True
    
    # Check for web search keywords
    should_search = is_web
    if not should_search:
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
    system = "You are a professional note summarizer. Give a concise summary without extra text."
    safe_text = truncate_text(text, 4000)
    prompt = f"Summarize this text as {mode}: \n\n{safe_text}"
    return await _chat(system, prompt)

async def simplify_note(text: str, level: str = "school") -> str:
    system = f"Explain this text like I am a {level} student. Be direct and simple."
    safe_text = truncate_text(text, 4000)
    return await _chat(system, safe_text)

async def extract_keywords(text: str) -> dict:
    system = "Return JSON ONLY: {\"keywords\":[], \"definitions\":[]}. Extract only from text."
    safe_text = truncate_text(text, 4000)
    raw = await _chat(system, safe_text)
    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {"keywords":[], "definitions":[]}
    except Exception: 
        return {"keywords":[], "definitions":[]}

async def translate_note(text: str, target_language: str) -> str:
    system = f"Translate the following text to {target_language}. Return ONLY the translated text. No explanation."
    safe_text = truncate_text(text, 3000)
    return await _chat(system, safe_text)

async def generate_big_questions(text: str) -> List[Dict]:
    """Generate long questions with expanded context for multi-page notes."""
    system = (
        "Generate 3 university-style long questions (10-16 marks) based on the notes. "
        "For each question, provide a structured 'outline' AND a comprehensive 'full_answer' (suitable for exam writing with headings). "
        "Return as JSON list: [{\"question\":\"...\", \"marks\":15, \"outline\":[\"...\"], \"full_answer\":\"...\"}]"
    )
    # Increased context for big questions to see the WHOLE document (up to 8k chars)
    safe_text = truncate_text(text, max_chars=8000)
    raw = await _chat(system, user=f"Notes:\n\n{safe_text}")
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return []
    except Exception: 
        return []

async def predict_exam_topics(text: str, weak_topics: List[str]) -> List[str]:
    system = "Identify most likely exam topics based on the notes and weak areas."
    safe_text = truncate_text(text, 4000)
    prompt = f"Notes: {safe_text}\nWeak Areas: {weak_topics}"
    raw = await _chat(system, prompt)
    return [t.strip() for t in raw.split("\n") if t.strip()]
