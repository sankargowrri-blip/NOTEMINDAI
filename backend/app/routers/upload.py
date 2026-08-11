"""File upload router with 2GB quota enforcement and optimized PDF handling."""
from __future__ import annotations
import io
import uuid
import logging
import fitz
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note, NoteStatus
from app.routers.deps import get_current_user
from app.services.storage_service import save_file, compute_file_hash
from app.services.text_refiner import refine_text
from app.services.ocr_service import run_ocr
from app.db.vector_store import index_note

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "application/pdf"}

def _extract_pdf_text_direct(pdf_bytes: bytes) -> str:
    """Fast extraction for text-based PDFs."""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        parts = []
        for page in doc:
            t = page.get_text("text")
            if t.strip(): 
                parts.append(t.strip())
        return "\n\n--- Page Break ---\n\n".join(parts)
    except Exception:
        return ""

def _split_pdf_to_images(pdf_bytes: bytes, max_pages: int = 20) -> list[bytes]:
    """Convert scanned PDF pages to images. Limited to first 20 pages on free tier."""
    pages = []
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for i, page in enumerate(doc):
            if i >= max_pages: 
                break
            pix = page.get_pixmap(dpi=150)
            pages.append(pix.tobytes("png"))
    except Exception:
        pass
    return pages

@router.post("/", status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    language: str = Form(default="en"),
    title: str = Form(default=""),
    subject: str = Form(default=""),
    semester: str = Form(default=""),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    
    # 1. Enforce 2GB Quota
    quota_mb = current_user.storage_quota_mb or 2048
    if (current_user.storage_used_mb + size_mb) > quota_mb:
        raise HTTPException(
            status_code=400, 
            detail="Storage limit reached. Please delete some notes to upload new files."
        )

    file_hash = compute_file_hash(content)
    is_pdf = file.filename.lower().endswith(".pdf")
    
    # 2. Try Direct Text Extraction (Fastest)
    raw_text = ""
    if is_pdf:
        raw_text = _extract_pdf_text_direct(content)
    
    # 3. Scanned / Image PDF Fallback (OCR)
    if not raw_text.strip():
        images = _split_pdf_to_images(content) if is_pdf else [content]
        text_parts = []
        for img in images:
            ocr_res = run_ocr(img, language=language)
            text_parts.append(ocr_res["text"])
        raw_text = "\n\n".join(text_parts)

    if not raw_text.strip():
        raise HTTPException(422, detail="No readable text found in file.")

    # 4. Save and Store
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    url = await save_file(content, current_user.id, f"original/{unique_name}")
    
    try:
        refined_res = refine_text(raw_text)
        refined = refined_res["refined_text"]
    except Exception:
        refined = raw_text
    
    note = Note(
        owner_id=current_user.id,
        title=title.strip() or file.filename.rsplit(".", 1)[0],
        status=NoteStatus.ready,
        language=language,
        original_file_url=url,
        refined_text=refined,
        raw_ocr_text=raw_text,
        file_hash=file_hash,
        file_size_mb=round(float(size_mb), 2),
        subject=subject or None,
        semester=semester or None
    )
    
    # Update user storage usage
    current_user.storage_used_mb = float(current_user.storage_used_mb or 0) + size_mb
    
    db.add(note)
    await db.commit()
    await db.refresh(note)
    
    # Index for AI Assistant
    try:
        chunks = [c for c in refined.split("\n\n") if len(c) > 50]
        if chunks:
            index_note(str(current_user.id), str(note.id), chunks)
    except Exception as e:
        logger.warning(f"AI Indexing failed: {e}")

    return {"note_id": note.id, "title": note.title, "ocr_text_preview": refined[:200]}
