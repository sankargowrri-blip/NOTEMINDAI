"""Disabled local vector store to save RAM on Render Free Tier."""
from __future__ import annotations
import logging

logger = logging.getLogger(__name__)

def index_note(user_id: str, note_id: str, chunks: list[str]):
    # Vector store is disabled to prevent memory crashes.
    # Note text is retrieved directly from PostgreSQL for AI tasks.
    logger.info(f"AI_INDEX_SKIPPED: Note {note_id} stored in DB only (RAM optimization).")

def search_notes(user_id: str, query: str, n_results: int = 5):
    # Fallback to direct DB retrieval
    return []
