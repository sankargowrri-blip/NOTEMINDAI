from __future__ import annotations
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import time
import logging
import shutil
import asyncio
import builtins

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
    
    # SMTP Diagnostics
    if not settings.smtp_user or not settings.smtp_password:
        logging.error("CRITICAL: SMTP_USER or SMTP_PASSWORD not set. Password reset will FAIL.")
    else:
        logging.info(f"SMTP Configured: {settings.smtp_user} via {settings.smtp_server}")
    
    # Diagnostics: Check AI Keys
    groq_key = getattr(settings, "groq_api_key", "")
    if groq_key and groq_key.startswith("gsk_"):
        logging.info("DIAGNOSTIC: Groq API Key found and valid format.")
    else:
        logging.warning("DIAGNOSTIC: Groq API Key is MISSING or invalid. AI features will fail.")

    await init_db()
    
    # ONE-TIME TOTAL SYSTEM PURGE (Requested by User for fresh start)
    from sqlalchemy import text, delete
    from app.models.note import Note
    from app.models.quiz import Quiz, QuizAttempt
    from app.models.flashcard import FlashcardSet, FlashcardRecall
    from app.models.analytics import StudySession, WeakTopic
    
    async def total_purge():
        async for db in get_db():
            logging.info("!!! STARTING TOTAL SYSTEM PURGE !!!")
            try:
                # 1. Clear SQL Data
                await db.execute(delete(QuizAttempt))
                await db.execute(delete(Quiz))
                await db.execute(delete(FlashcardRecall))
                await db.execute(delete(FlashcardSet))
                await db.execute(delete(StudySession))
                await db.execute(delete(WeakTopic))
                await db.execute(delete(Note))
                # Note: We keep User accounts but reset their storage
                await db.execute(text("UPDATE users SET storage_used_mb = 0"))
                
                # 2. Clear MongoDB
                try:
                    from app.db.mongo import get_mongo_db
                    mdb = get_mongo_db()
                    for coll in ["notes_content", "note_versions", "chat_history", "quiz_responses", "bookmarks"]:
                        await mdb[coll].delete_many({})
                except: pass
                
                # 3. Clear Files
                upload_dir = settings.local_upload_dir
                if os.path.exists(upload_dir):
                    for f in os.listdir(upload_dir):
                        path = os.path.join(upload_dir, f)
                        if os.path.isfile(path): os.unlink(path)
                        elif os.path.isdir(path): shutil.rmtree(path)
                
                await db.commit()
                logging.info("!!! PURGE COMPLETED SUCCESSFULLY !!!")
            except Exception as e:
                logging.error(f"PURGE FAILED: {e}")
            break

    try:
        asyncio.create_task(total_purge())
    except Exception as e:
        logging.error(f"Background task failed: {e}")
    
    yield
    logging.info("Shutting down NoteMind AI...")

app = FastAPI(
    title="NoteMind AI",
    description="AI-Powered Handwritten Notes Recognition & Smart Study Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# Production Logging Middleware
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("notemind")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(f"PROD_LOG: {request.method} {request.url.path} - Status: {response.status_code} - Duration: {duration:.2f}s")
    return response

# Permissive CORS for cloud-to-cloud communication
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
    health_status = {"status": "ok", "postgres": "disconnected", "mongodb": "disconnected"}
    
    # Check Postgres
    try:
        from sqlalchemy import text
        async for db in get_db():
            await db.execute(text("SELECT 1"))
            health_status["postgres"] = "connected"
            break
    except Exception as e:
        logging.error(f"Postgres Health check failed: {e}")
        health_status["status"] = "error"

    # Check MongoDB
    try:
        from app.db.mongo import get_mongo_client
        client = get_mongo_client()
        await client.admin.command('ping')
        health_status["mongodb"] = "connected"
    except Exception as e:
        logging.error(f"MongoDB Health check failed: {e}")
        health_status["status"] = "error"

    status_code = status.HTTP_200_OK if health_status["status"] == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=status_code, content=health_status)
