"""
all-MiniLM-L6-v2 — runs 100% locally, no API key, completely free.
384-dimensional embeddings. Downloads ~90MB on first run, then cached.
"""
import asyncio
from sentence_transformers import SentenceTransformer

_model: SentenceTransformer | None = None

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def _encode_sync(text: str) -> list[float]:
    model = _get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


async def embed_text(text: str) -> list[float]:
    """Embed a document for indexing (e.g. conversation summary)."""
    return await asyncio.to_thread(_encode_sync, text)


async def embed_query(text: str) -> list[float]:
    """Embed a search query."""
    return await asyncio.to_thread(_encode_sync, text)
