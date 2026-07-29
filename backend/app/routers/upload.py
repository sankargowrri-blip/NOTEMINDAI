"""File upload router with image enhancement + OCR pipeline trigger."""
from __future__ import annotations
import io
import uuid
import logging
import fitz  # PyMuPDF
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.postgres import get_db
from app.models.user import User
from app.models.note import Note, NoteStatus
from app.routers.deps import get_current_user
from app.services.storage_service import save_file, compute_file_hash
from app.services.image_enhancer import full_enhance_pipeline
from app.services.ocr_service import run_ocr
from app.services.text_refiner import refine_text
from app.db.vector_store import index_note

router = APIRouter()
logger = logging.getLogger(__name__)

# Accept all common image MIME types browsers might send
ALLOWED_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/tiff", "image/bmp", "application/pdf",
}
MAX_SIZE_MB = 20


def _is_allowed(content_type: str | None) -> bool:
    if content_type is None:
        return True  # allow if browser didn't set it
    ct = content_type.lower().split(";")[0].strip()
    return ct in ALLOWED_TYPES or ct.startswith("image/")


def _extract_pdf_text_direct(pdf_bytes: bytes) -> str:
    """Extract text directly from a text-based PDF using PyMuPDF (fast, no OCR needed)."""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        parts = []
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                parts.append(text.strip())
        return "\n\n--- Page Break ---\n\n".join(parts)
    except Exception as e:
        logger.warning(f"PDF direct text extraction failed: {e}")
        return ""


def _split_pdf_to_images(pdf_bytes: bytes) -> list[bytes]:
    """Convert each PDF page to PNG bytes (used only for scanned/image PDFs)."""
    pages = []
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            pages.append(pix.tobytes("png"))
    except Exception as e:
        logger.warning(f"PDF split failed: {e}")
    return pages or [pdf_bytes]


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
    # Validate MIME type
    if not _is_allowed(file.content_type):
        raise HTTPException(
            400,
            detail=f"Unsupported file type '{file.content_type}'. Upload JPG, PNG, or PDF."
        )

    content = await file.read()
    if not content:
        raise HTTPException(400, detail="Uploaded file is empty.")

    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_SIZE_MB:
        raise HTTPException(400, detail=f"File too large. Maximum is {MAX_SIZE_MB} MB.")

    file_hash = compute_file_hash(content)

    # Duplicate check
    dup = await db.execute(
        select(Note).where(Note.owner_id == current_user.id, Note.file_hash == file_hash)
    )
    if dup.scalar_one_or_none():
        raise HTTPException(409, detail="Duplicate file detected. This note already exists.")

    # Split PDF into pages, or treat single image as one page
    is_pdf = (file.content_type or "").lower() == "application/pdf" or \
             (file.filename or "").lower().endswith(".pdf")

    # For text-based PDFs, extract text directly (fast, accurate)
    if is_pdf:
        direct_text = _extract_pdf_text_direct(content)
        if len(direct_text.strip()) > 100:
            # It's a text PDF — skip OCR entirely
            raw_text = direct_text
            avg_confidence = 1.0
            images = _split_pdf_to_images(content)

            note_title = title.strip() or (file.filename or "Untitled Note").rsplit(".", 1)[0]
            unique_name = f"{uuid.uuid4()}_{file.filename}"
            original_url = await save_file(content, current_user.id, f"original/{unique_name}")

            try:
                refined_result = refine_text(raw_text)
                refined = refined_result["refined_text"]
            except Exception as e:
                logger.warning(f"Text refinement failed: {e}")
                refined = raw_text

            note = Note(
                owner_id=current_user.id,
                title=note_title,
                status=NoteStatus.ready,
                ocr_confidence=round(avg_confidence, 3),
                language=language,
                original_file_url=original_url,
                enhanced_file_url=original_url,
                raw_ocr_text=raw_text,
                refined_text=refined,
                formatted_text=refined,
                file_hash=file_hash,
                page_count=len(images),
                file_size_mb=round(size_mb, 3),
                subject=subject or None,
                semester=semester or None,
            )
            db.add(note)
            current_user.storage_used_mb = (current_user.storage_used_mb or 0.0) + size_mb
            await db.commit()
            await db.refresh(note)

            try:
                chunks = [c for c in refined.split("\n\n") if c.strip()]
                if chunks:
                    index_note(str(current_user.id), str(note.id), chunks)
            except Exception as e:
                logger.warning(f"Vector indexing failed: {e}")

            return {
                "note_id": note.id,
                "title": note.title,
                "status": note.status.value,
                "ocr_confidence": note.ocr_confidence,
                "page_count": note.page_count,
                "ocr_text_preview": raw_text[:300],
                "no_text_detected": False,
                "low_confidence_warning": False,
            }

    images = _split_pdf_to_images(content) if is_pdf else [content]

    note_title = title.strip() or (file.filename or "Untitled Note").rsplit(".", 1)[0]
    unique_name = f"{uuid.uuid4()}_{file.filename}"

    # Save original file
    original_url = await save_file(content, current_user.id, f"original/{unique_name}")

    all_text_parts: list[str] = []
    confidences: list[float] = []
    enhanced_urls: list[str] = []

    for idx, img_bytes in enumerate(images):
        # --- Image Enhancement ---
        try:
            enhanced = full_enhance_pipeline(img_bytes)
        except Exception as e:
            logger.warning(f"Enhancement failed on page {idx}: {e}")
            enhanced = img_bytes

        try:
            enhanced_name = f"{uuid.uuid4()}_enhanced_{idx}.png"
            eurl = await save_file(enhanced, current_user.id, f"enhanced/{enhanced_name}")
            enhanced_urls.append(eurl)
        except Exception:
            enhanced_urls.append(original_url)

        # --- OCR ---
        try:
            ocr_result = run_ocr(enhanced, language=language)
        except Exception as e:
            logger.warning(f"OCR failed on page {idx}: {e}")
            ocr_result = {"text": "", "confidence": 0.0, "engine": "failed"}

        all_text_parts.append(ocr_result["text"])
        confidences.append(ocr_result["confidence"])

    raw_text = "\n\n--- Page Break ---\n\n".join(all_text_parts)
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

    # --- Text Refinement ---
    try:
        refined_result = refine_text(raw_text)
        refined = refined_result["refined_text"]
    except Exception as e:
        logger.warning(f"Text refinement failed: {e}")
        refined = raw_text

    # --- Save note to DB ---
    note = Note(
        owner_id=current_user.id,
        title=note_title,
        status=NoteStatus.ready,
        ocr_confidence=round(avg_confidence, 3),
        language=language,
        original_file_url=original_url,
        enhanced_file_url=enhanced_urls[0] if enhanced_urls else None,
        raw_ocr_text=raw_text,
        refined_text=refined,
        formatted_text=refined,
        file_hash=file_hash,
        page_count=len(images),
        file_size_mb=round(size_mb, 3),
        subject=subject or None,
        semester=semester or None,
    )
    db.add(note)
    current_user.storage_used_mb = (current_user.storage_used_mb or 0.0) + size_mb
    await db.commit()
    await db.refresh(note)

    # --- Index for RAG ---
    try:
        chunks = [c for c in refined.split("\n\n") if c.strip()]
        if chunks:
            index_note(str(current_user.id), str(note.id), chunks)
    except Exception as e:
        logger.warning(f"Vector indexing failed: {e}")

    return {
        "note_id": note.id,
        "title": note.title,
        "status": note.status.value,
        "ocr_confidence": note.ocr_confidence,
        "page_count": note.page_count,
        "ocr_text_preview": raw_text[:300] if raw_text else "",
        "no_text_detected": not bool(raw_text.strip()),
        "low_confidence_warning": avg_confidence < 0.5 and bool(raw_text.strip()),
    }


@router.post("/batch", status_code=201)
async def upload_batch(
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if len(files) > 50:
        raise HTTPException(400, detail="Maximum 50 files per batch upload.")
    results = []
    for f in files:
        try:
            content = await f.read()
            size_mb = len(content) / (1024 * 1024)
            if size_mb > MAX_SIZE_MB:
                results.append({"filename": f.filename, "error": "File too large"})
            else:
                results.append({"filename": f.filename, "status": "queued"})
        except Exception as e:
            results.append({"filename": f.filename, "error": str(e)})
    return {"batch_results": results, "count": len(results)}
