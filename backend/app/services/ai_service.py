"""AI service using Groq. Precision-locked to note text (Memory Optimized)."""
from __future__ import annotations
import json, re, logging
from app.config import settings
from app.services.search_tool import search_tool
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

async def _chat(system: str, user: str, max_tokens: int = 2048, messages: Optional[List[Dict]] = None) -> str:
    groq_key = getattr(settings, "groq_api_key", "")
    if groq_key and groq_key.startswith("gsk_"):
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            
            chat_messages = [{"role": "system", "content": system}]
            if messages:
                chat_messages.extend(messages[-5:]) # Keep last 5 for context
            chat_messages.append({"role": "user", "content": user})
            
            resp = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=chat_messages,
                max_tokens=max_tokens,
                temperature=0.3, # Slightly higher for more conversational tone in chat
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"AI_ERROR: {e}")
    return "AI_UNAVAILABLE"

async def rag_chat(user_id: str, question: str, note_text: str = "", history: List[Dict] = None) -> dict:
    # 1. Search notes first
    found_in_notes = False
    system = (
        "You are NoteMind AI. Answer primarily using the note text provided. "
        "If you use information from the notes, prefix it with [Notes]. "
        "If the information is not in the notes, you may use your knowledge or internet search results, but prefix it with [Web]."
    )
    
    user_prompt = f"NOTE TEXT:\n{note_text}\n\nQUESTION: {question}"
    
    # 2. Check if we need web search (simple heuristic)
    web_results = []
    if not note_text or len(note_text) < 50:
        web_results = await search_tool.search(question)
        if web_results:
            user_prompt += f"\n\nWEB SEARCH RESULTS:\n{json.dumps(web_results)}"

    answer = await _chat(system, user_prompt, messages=history)
    
    return {
        "answer": answer,
        "sources": ["notes"] if "[Notes]" in answer else (["web"] if "[Web]" in answer else []),
        "is_web": "[Web]" in answer
    }

async def generate_summary(text: str, mode: str = "bullet") -> str:
    system = "You are a professional note summarizer. Use ONLY the text provided."
    prompt = f"Summarize this text as {mode}: \n\n{text}"
    return await _chat(system, prompt)

async def simplify_note(text: str, level: str = "school") -> str:
    system = f"Explain this text like I am a {level} student. Use simple language and analogies."
    prompt = f"Text to simplify:\n\n{text}"
    return await _chat(system, prompt)

async def extract_keywords(text: str) -> dict:
    system = "You are an extractor. Return JSON ONLY: {\"keywords\":[], \"definitions\":[]}"
    prompt = f"Extract from this text:\n\n{text}"
    raw = await _chat(system, prompt)
    try:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        return json.loads(match.group()) if match else {"keywords":[], "definitions":[]}
    except: return {"keywords":[], "definitions":[]}

async def translate_note(text: str, target_language: str) -> str:
    system = f"Translate to {target_language}. Use ONLY the text provided."
    return await _chat(system, text)

async def generate_big_questions(text: str) -> List[Dict]:
    system = (
        "Generate 3 university-style long questions (10-16 marks) based on the notes. "
        "For each question, provide a structured outline of how to answer it. "
        "Return as JSON list: [{\"question\": \"...\", \"marks\": 15, \"outline\": [\"...\", \"...\"]}]"
    )
    prompt = f"Notes:\n\n{text}"
    raw = await _chat(system, prompt)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        return json.loads(match.group()) if match else []
    except: return []

async def generate_mind_map(text: str) -> dict:
    system = "Generate a Mermaid mindmap for the following text. Return ONLY the mermaid code starting with mindmap."
    return {"code": await _chat(system, text)}

async def generate_flowchart(text: str) -> dict:
    system = "Generate a Mermaid flowchart for the following text. Return ONLY the mermaid code starting with graph TD."
    return {"code": await _chat(system, text)}

async def predict_exam_topics(text: str, weak_topics: List[str]) -> List[str]:
    system = "Identify most likely exam topics based on the notes and weak areas."
    prompt = f"Notes: {text}\nWeak Areas: {weak_topics}"
    raw = await _chat(system, prompt)
    return [t.strip() for t in raw.split("\n") if t.strip()]
