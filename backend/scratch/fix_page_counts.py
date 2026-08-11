import asyncio
import os
import sys

# Add backend root to sys.path to avoid ModuleNotFoundError
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

import fitz
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.config import settings
from app.models.note import Note

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("repair_script")

# Production / Dev Database URL
DB_URL = settings.postgres_url.replace("postgresql://", "postgresql+asyncpg://")

async def repair_notes():
    logger.info("Starting Note Repair Script...")
    engine = create_async_engine(DB_URL)
    AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        # 1. Fetch all notes
        result = await db.execute(select(Note))
        notes = result.scalars().all()
        logger.info(f"Found {len(notes)} notes to check.")

        updated_count = 0
        for note in notes:
            if not note.original_file_url:
                continue

            # Convert URL to local path
            # Assuming files are stored in 'uploads/' and url is '/uploads/...'
            relative_path = note.original_file_url.replace("/uploads/", "")
            full_path = os.path.join(settings.local_upload_dir, relative_path)

            if not os.path.exists(full_path):
                logger.warning(f"File not found: {full_path} for note {note.id}")
                continue

            try:
                # 2. Open PDF and count pages
                if full_path.lower().endswith(".pdf"):
                    doc = fitz.open(full_path)
                    real_page_count = len(doc)
                    
                    if note.page_count != real_page_count:
                        logger.info(f"Note {note.id} ('{note.title}'): Correcting page count {note.page_count} -> {real_page_count}")
                        note.page_count = real_page_count
                        
                        # 3. If it was stuck at 1 page, re-extract full text
                        # (Only if the text is significantly shorter than expected)
                        current_text_len = len(note.refined_text or "")
                        if real_page_count > 1 and current_text_len < 2000:
                            logger.info(f"Note {note.id}: Re-extracting full text from {real_page_count} pages...")
                            parts = []
                            for page in doc:
                                parts.append(page.get_text("text").strip())
                            full_text = "\n\n".join(parts)
                            if full_text.strip():
                                note.refined_text = full_text
                                note.raw_ocr_text = full_text
                        
                        updated_count += 1
            except Exception as e:
                logger.error(f"Failed to process note {note.id}: {e}")

        if updated_count > 0:
            await db.commit()
            logger.info(f"SUCCESS: Repaired {updated_count} notes.")
        else:
            logger.info("No notes needed repair.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(repair_notes())
