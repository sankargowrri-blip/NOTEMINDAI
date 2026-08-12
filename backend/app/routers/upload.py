"""File upload router with 2GB quota enforcement and background multi-page processing."""
from __future__ import annotations
import io
import uuid
import logging
import fitz
import typing
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.postgres import get_db, AsyncSessionLocal
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

async def process_note_background(note_id: int, content: bytes, language: str, filename: str, user_id: int):
    """Heavy processing (OCR, Refinement, Indexing) moved to background to prevent timeouts."""
    async with AsyncSessionLocal() as db:
        try:
            # 1. Re-fetch the note
            result = await db.execute(select(Note).where(Note.id == note_id))
            note = result.scalar_one_or_none()
            if not note:
                logger.error(f"BACKGROUND_PROC_FAILED: Note {note_id} not found.")
                return

            is_pdf = filename.lower().endswith(".pdf")
            page_count = 1
            raw_text = ""

            # 2. Extract Text / Metadata
            if is_pdf:
                try:
                    doc = fitz.open("pdf", content)
                    page_count = doc.page_count
                    
                    # Extract text from all pages
                    parts = []
                    for page in doc:
                        t = page.get_text("text")
                        if t.strip():
                            parts.append(t.strip())
                    raw_text = "\n\n".join(parts)
                    doc.close()
                except Exception as e:
                    logger.error(f"BACKGROUND_PDF_ERROR: {e}")

            # 3. OCR Fallback (if no text extracted or specifically requested)
            if not raw_text.strip():
                logger.info(f"BACKGROUND_OCR_START: Running OCR for note {note_id}")
                note.status = NoteStatus.ocr_processing
                await db.commit()

                text_parts = []
                if is_pdf:
                    try:
                        doc = fitz.open("pdf", content)
                        # Process up to 50 pages for OCR to avoid memory issues on free tier
                        for i, page in enumerate(doc):
                            if i >= 50: break 
                            pix = page.get_pixmap(dpi=150)
                            img_bytes = pix.tobytes("png")
                            ocr_res = run_ocr(img_bytes, language=language)
                            text_parts.append(ocr_res["text"])
                        doc.close()
                    except Exception as e:
                        logger.error(f"BACKGROUND_OCR_PDF_ERROR: {e}")
                else:
                    ocr_res = run_ocr(content, language=language)
                    text_parts.append(ocr_res["text"])
                
                raw_text = "\n\n".join(text_parts)

            if not raw_text.strip():
                note.status = NoteStatus.error
                await db.commit()
                return

            # 4. Refinement
            note.status = NoteStatus.refining
            await db.commit()
            
            try:
                # Refine text in blocks if very large
                refined_res = refine_text(raw_text)
                refined = refined_res["refined_text"]
            except Exception as e:
                logger.warning(f"BACKGROUND_REFINEMENT_FAILED: {e}")
                refined = raw_text

            # 5. Update Note and Set Ready
            note.page_count = page_count
            note.raw_ocr_text = raw_text
            note.refined_text = refined
            note.status = NoteStatus.ready
            await db.commit()

            # 6. Indexing
            try:
                chunks = [c.strip() for c in refined.split("\n\n") if len(c.strip()) > 50]
                if chunks:
                    index_note(str(user_id), str(note.id), chunks)
            except Exception as e:
                logger.warning(f"BACKGROUND_INDEXING_FAILED: {e}")

            logger.info(f"BACKGROUND_PROC_SUCCESS: Note {note_id} is ready ({page_count} pages).")

        except Exception as e:
            logger.error(f"BACKGROUND_CRITICAL_ERROR: {e}")
            try:
                # Re-fetch in case of session issues
                async with AsyncSessionLocal() as err_db:
                    res = await err_db.execute(select(Note).where(Note.id == note_id))
                    err_note = res.scalar_one_or_none()
                    if err_note:
                        err_note.status = NoteStatus.error
                        await err_db.commit()
            except: pass

@router.post("/", status_code=201)
async def upload_file(
    background_tasks: BackgroundTasks,
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
    
    # 2. Immediate Save to Storage
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    url = await save_file(content, current_user.id, f"original/{unique_name}")
    
    # 3. Create Note Entry (Pending)
    note = Note(
        owner_id=current_user.id,
        title=title.strip() or file.filename.rsplit(".", 1)[0],
        status=NoteStatus.pending,
        language=language,
        original_file_url=url,
        file_hash=file_hash,
        file_size_mb=round(float(size_mb), 2),
        subject=subject or None,
        semester=semester or None,
        page_count=1 # Default until background proc updates it
    )
    
    # Update user storage usage
    current_user.storage_used_mb = float(current_user.storage_used_mb or 0) + size_mb
    
    db.add(note)
    await db.commit()
    await db.refresh(note)
    
    # 4. Offload Heavy Processing to Background
    background_tasks.add_task(
        process_note_background, 
        note.id, 
        content, 
        language, 
        file.filename, 
        current_user.id
    )

    return {"note_id": note.id, "title": note.title, "status": "processing"}
