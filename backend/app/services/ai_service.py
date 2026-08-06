"""AI service using Groq. Precision-locked to note text with Diagram support."""
from __future__ import annotations
import json, re, logging
from app.config import settings
from app.services.search_tool import search_tool
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

async def _chat(system: str, user: str, max_tokens: int = 4096, messages: Optional[List[Dict]] = None) -> str:
    """Call Groq using Async client for better performance."""
    groq_key = getattr(settings, "groq_api_key", "")
    if groq_key and groq_key.startswith("gsk_"):
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=groq_key)
            
            chat_messages = [{"role": "system", "content": system}]
            if messages:
                history = [m for m in messages if m.get("role") != "system"]
                chat_messages.extend(history[-8:]) # Increased history context
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
    Enhanced RAG Chat with Hybrid Search and Diagram Support.
    """
    
    is_web = False
    
    # SYSTEM PROMPT FOR RICH EXPLANATIONS & DIAGRAMS
    system = (
        "You are NoteMind AI, an expert study assistant. Your goal is to clear any doubt the student has. "
        "1. GROUNDING: Use the provided [NOTE TEXT] first. If information is missing, use your internal knowledge and [WEB SEARCH]. "
        "2. STRUCTURE: Provide step-by-step explanations, clear definitions, and real-world examples. "
        "3. DIAGRAMS: If a student asks for a diagram, or if a flowchart/mindmap would help explain a complex process, "
        "generate it using Mermaid.js syntax inside triple backticks like this: ```mermaid ... ```. "
        "Supported diagrams: flowchart (graph TD), mindmap, sequenceDiagram, pie, gantt, etc. "
        "4. CODING: If the topic is programming, provide sample code snippets. "
        "5. TONE: Always prefix answers with [Notes] if from study material, or [Web] if from external resources."
    )
    
    user_prompt = ""
    if note_text and len(note_text.strip()) > 50:
        user_prompt += f"NOTE TEXT:\n{note_text}\n\n"
    else:
        is_web = True
    
    # Internet Search Fallback for complex questions or missing notes
    if is_web or any(word in question.lower() for word in ["latest", "recent", "who is", "what is the current"]):
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
    system = "You are a professional note summarizer. Use ONLY the text provided. No external info."
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
    except Exception: return {"keywords":[], "definitions":[]}

async def translate_note(text: str, target_language: str) -> str:
    system = f"Translate to {target_language}. Use ONLY the text provided."
    return await _chat(system, text)

async def generate_big_questions(text: str) -> List[Dict]:
    system = (
        "Generate 3 university-style long questions (10-16 marks) based on the notes. "
        "For each question, provide a structured outline including Introduction, Architecture, Working, Applications, and Conclusion. "
        "Return as JSON list: [{\"question\": \"...\", \"marks\": 15, \"outline\": [\"...\", \"...\"]}]"
    )
    prompt = f"Notes:\n\n{text}"
    raw = await _chat(system, prompt)
    try:
        match = re.search(r"\[.*\]", raw, re.DOTALL)
        return json.loads(match.group()) if match else []
    except Exception: return []

async def generate_mind_map(text: str) -> dict:
    system = "Generate a Mermaid mindmap for the following text. Return ONLY the mermaid code block."
    return {"code": await _chat(system, text)}

async def generate_flowchart(text: str) -> dict:
    system = "Generate a Mermaid flowchart for the following text. Return ONLY the mermaid code block starting with graph TD."
    return {"code": await _chat(system, text)}

async def predict_exam_topics(text: str, weak_topics: List[str]) -> List[str]:
    system = "Identify most likely exam topics based on the notes and weak areas."
    prompt = f"Notes: {text}\nWeak Areas: {weak_topics}"
    raw = await _chat(system, prompt)
    return [t.strip() for t in raw.split("\n") if t.strip()]
