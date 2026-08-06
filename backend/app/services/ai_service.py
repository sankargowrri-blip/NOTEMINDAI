"""AI service using Groq. Precision-locked to note text (Memory Optimized)."""
from __future__ import annotations
import json, re, logging
from app.config import settings
from app.services.search_tool import search_tool
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

async def _chat(system: str, user: str, max_tokens: int = 2048, messages: Optional[List[Dict]] = None) -> str:
    """Call Groq using Async client for better performance."""
    groq_key = getattr(settings, "groq_api_key", "")
    if groq_key and groq_key.startswith("gsk_"):
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=groq_key)
            
            chat_messages = [{"role": "system", "content": system}]
            if messages:
                # Filter out system messages from history to avoid conflicts
                history = [m for m in messages if m.get("role") != "system"]
                chat_messages.extend(history[-5:]) 
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
    return "AI_UNAVAILABLE"

async def rag_chat(user_id: str, question: str, note_text: str = "", history: List[Dict] = None) -> dict:
    """
    RAG Chat. 
    Strictly follows notes if available. 
    Falls back to web search ONLY if notes are explicitly missing or the user asks for external info.
    """
    
    is_web = False
    
    if note_text and len(note_text.strip()) > 50:
        # Note found - STRICT GROUNDING
        system = (
            "You are NoteMind AI. Answer strictly using the note text provided below. "
            "Always prefix your answer with [Notes]. "
            "If the question is not answerable from the notes, say: 'I'm sorry, I couldn't find that in your notes. Would you like me to search the web instead?'"
        )
        user_prompt = f"NOTE TEXT:\n{note_text}\n\nQUESTION: {question}"
    else:
        # No note selected or note is empty - WEB SEARCH FALLBACK
        is_web = True
        system = (
            "You are NoteMind AI. I couldn't find any relevant notes selected. "
            "I have searched the internet to help you. Prefix your answer with [Web]. "
            "Remind the user to select a note from the dropdown if they want answers based on their study material."
        )
        web_results = await search_tool.search(question)
        user_prompt = f"WEB SEARCH RESULTS:\n{json.dumps(web_results)}\n\nQUESTION: {question}"

    answer = await _chat(system, user_prompt, messages=history)
    
    return {
        "answer": answer,
        "sources": ["notes"] if not is_web else ["web"],
        "is_web": is_web
    }

async def generate_summary(text: str, mode: str = "bullet") -> str:
    system = "You are a professional note summarizer. Use ONLY the text provided. No external info."
    prompt = f"Summarize this text as {mode}: \n\n{text}"
    return await _chat(system, prompt)

async def simplify_note(text: str, level: str = "school") -> str:
    system = f"Explain this text like I am a {level} student. Use simple language and analogies. Use ONLY info from the text."
    prompt = f"Text to simplify:\n\n{text}"
    return await _chat(system, prompt)

async def extract_keywords(text: str) -> dict:
    system = "You are an extractor. Return JSON ONLY: {\"keywords\":[], \"definitions\":[]}. Use ONLY info from the text."
    prompt = f"Extract from this text:\n\n{text}"
    raw = await _chat(system, prompt)
    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        return json.loads(match.group()) if match else {"keywords":[], "definitions":[]}
    except Exception:
        return {"keywords":[], "definitions":[]}

async def translate_note(text: str, target_language: str) -> str:
    system = f"Translate to {target_language}. Use ONLY the text provided."
    return await _chat(system, text)

async def generate_big_questions(text: str) -> List[Dict]:
    system = (
        "Generate 3 university-style long questions (10-16 marks) based STRICTLY on the notes provided. "
        "For each question, provide a structured outline of how to answer it. "
        "Return as JSON list: [{\"question\": \"...\", \"marks\": 15, \"outline\": [\"...\", \"...\"]}]"
    )
    prompt = f"Notes:\n\n{text}"
    raw = await _chat(system, prompt)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return []
    except Exception:
        return []

async def generate_mind_map(text: str) -> dict:
    system = "Generate a Mermaid mindmap for the following text. Return ONLY the mermaid code starting with mindmap."
    return {"code": await _chat(system, text)}

async def generate_flowchart(text: str) -> dict:
    system = "Generate a Mermaid flowchart for the following text. Return ONLY the mermaid code starting with graph TD."
    return {"code": await _chat(system, text)}

async def predict_exam_topics(text: str, weak_topics: List[str]) -> List[str]:
    system = "Identify most likely exam topics based STRICTLY on the notes and weak areas."
    prompt = f"Notes: {text}\nWeak Areas: {weak_topics}"
    raw = await _chat(system, prompt)
    return [t.strip() for t in raw.split("\n") if t.strip()]
