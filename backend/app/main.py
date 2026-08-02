from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import logging

from app.config import settings
from app.db.postgres import init_db, get_db
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

# Robust CORS - Allow everything for production stability
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.get("/health/db", tags=["Health"])
async def health_db():
    try:
        from sqlalchemy import text
        async for db in get_db():
            await db.execute(text("SELECT 1"))
            break
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logging.error(f"DB Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "error", "message": "Database connection failed"}
        )
