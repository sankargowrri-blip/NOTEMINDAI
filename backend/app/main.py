from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import time
import logging

from app.config import settings
from app.db.postgres import init_db
from app.routers import (
    auth,
    users,
    notes,
    upload,
    ocr,
    ai_assistant,
    quiz,
    flashcards,
    revision,
    analytics,
    export,
    search,
    collaboration,
    admin,
    translate,
    voice,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("Starting up NoteMind AI...")
    await init_db()
    yield
    logging.info("Shutting down NoteMind AI...")

app = FastAPI(
    title="NoteMind AI",
    description="AI-Powered Handwritten Notes Recognition & Smart Study Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# Production Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("notemind")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(f"API_LOG: {request.method} {request.url.path} - Status: {response.status_code} - {duration:.2f}s")
    return response

# FIXED CORS: Explicit origins for credentialed requests (Required for browser handshake)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://frontend-iota-sepia-w5lxtih60r.vercel.app",
        "https://frontend-pnitfvp2j-sankargowrri-4781s-projects.vercel.app",
        "https://frontend-ptcte9pqy-sankargowrri-4781s-projects.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

upload_dir = settings.local_upload_dir
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(notes.router, prefix="/api/notes", tags=["Notes"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])
app.include_router(ai_assistant.router, prefix="/api/ai", tags=["AI Assistant"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["Flashcards"])
app.include_router(revision.router, prefix="/api/revision", tags=["Revision Planner"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(collaboration.router, prefix="/api/collaboration", tags=["Collaboration"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(translate.router, prefix="/api/translate", tags=["Translation"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice AI"])

@app.get("/", tags=["Health"])
async def root():
    return {"message": "NoteMind AI API is running", "version": "1.0.0"}

@app.head("/", tags=["Health"])
async def root_head():
    return None

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
