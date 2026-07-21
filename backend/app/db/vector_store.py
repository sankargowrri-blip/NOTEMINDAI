"""ChromaDB vector store for RAG pipeline."""
from __future__ import annotations
import chromadb
from sentence_transformers import SentenceTransformer
from app.config import settings

_chroma_client = None
_embedder: SentenceTransformer | None = None

EMBED_MODEL = "all-MiniLM-L6-v2"


def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(EMBED_MODEL)
    return _embedder


def get_chroma_client() -> chromadb.Client:
    """Return a persistent local ChromaDB client."""
    return chromadb.PersistentClient(path="./chroma_db")


def get_user_collection(user_id: str):
    """Each user gets their own ChromaDB collection."""
    client = get_chroma_client()
    collection_name = f"user_{user_id}"
    return client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )


def embed_texts(texts: list[str]) -> list[list[float]]:
    embedder = get_embedder()
    return embedder.encode(texts, show_progress_bar=False).tolist()


def index_note(user_id: str, note_id: str, chunks: list[str]) -> None:
    """Index note chunks into the user's vector collection."""
    if not chunks:
        return
    collection = get_user_collection(user_id)
    embeddings = embed_texts(chunks)
    ids = [f"{note_id}_{i}" for i in range(len(chunks))]
    metadatas = [{"note_id": note_id, "chunk_index": i} for i in range(len(chunks))]
    # Delete old chunks for this note first
    try:
        existing = collection.get(where={"note_id": note_id})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
    except Exception:
        pass
    collection.add(documents=chunks, embeddings=embeddings, ids=ids, metadatas=metadatas)


def search_notes(user_id: str, query: str, n_results: int = 5) -> list[dict]:
    """Semantic search across all notes for a user."""
    collection = get_user_collection(user_id)
    query_embedding = embed_texts([query])[0]
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )
    output = []
    if results["documents"]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            output.append({"text": doc, "note_id": meta["note_id"], "score": 1 - dist})
    return output
