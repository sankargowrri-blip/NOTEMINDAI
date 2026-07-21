"""Voice AI router: text-to-speech, voice search transcription."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from openai import OpenAI

from app.models.user import User
from app.routers.deps import get_current_user
from app.config import settings

router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    voice: str = "alloy"  # alloy | echo | fable | onyx | nova | shimmer


@router.post("/tts")
async def text_to_speech(
    body: TTSRequest,
    current_user: User = Depends(get_current_user),
):
    """Convert text to speech using OpenAI TTS."""
    if not settings.openai_api_key:
        raise HTTPException(503, detail="TTS service not configured")
    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.audio.speech.create(
            model="tts-1",
            voice=body.voice,
            input=body.text[:4096],
        )
        # OpenAI v2: use .read() to get bytes
        audio_bytes = response.read()
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(500, detail=f"TTS failed: {str(e)}")


@router.post("/transcribe")
async def transcribe_voice(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Transcribe voice audio using OpenAI Whisper."""
    if not settings.openai_api_key:
        raise HTTPException(503, detail="Voice service not configured")
    try:
        client = OpenAI(api_key=settings.openai_api_key)
        audio_bytes = await file.read()
        import io
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = file.filename or "audio.webm"
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
        )
        return {"transcript": transcript.text}
    except Exception as e:
        raise HTTPException(500, detail=f"Transcription failed: {str(e)}")
