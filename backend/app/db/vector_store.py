"""Persistent ChromaDB vector store."""
from __future__ import annotations
import os
import logging
import chromadb
from sentence_transformers import SentenceTransformer
from app.config import settings

logger = logging.getLogger(__name__)
_embedder = None
EMBED_MODEL = "all-MiniLM-L6-v2"

def get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(EMBED_MODEL)
    return _embedder

def get_chroma_client():
    # Use a persistent path
    return chromadb.PersistentClient(path="./chroma_db")

def index_note(user_id: str, note_id: str, chunks: list[str]):
    if not chunks: 
        return
    try:
        client = get_chroma_client()
        collection = client.get_or_create_collection(name=f"user_{user_id}")
        
        embeddings = get_embedder().encode(chunks, show_progress_bar=False).tolist()
        ids = [f"{note_id}_{i}" for i in range(len(chunks))]
        metadatas = [{"note_id": note_id} for _ in range(len(chunks))]
        
        collection.add(documents=chunks, embeddings=embeddings, ids=ids, metadatas=metadatas)
        logger.info(f"AI_INDEX_SUCCESS: Note {note_id} indexed.")
    except Exception as e:
        logger.error(f"AI_INDEX_FAILED: {str(e)}")

def search_notes(user_id: str, query: str, n_results: int = 5):
    try:
        client = get_chroma_client()
        collection = client.get_collection(name=f"user_{user_id}")
        
        query_emb = get_embedder().encode([query])[0].tolist()
        res = collection.query(query_embeddings=[query_emb], n_results=n_results)
        
        output = []
        if res["documents"] and res["documents"][0]:
            for doc, meta in zip(res["documents"][0], res["metadatas"][0]):
                output.append({"text": doc, "note_id": meta["note_id"]})
        return output
    except Exception as e:
        logger.warning(f"AI_SEARCH_EMPTY: {str(e)}")
        return []
