"""
Gemini text-embedding-004 — replaces sentence-transformers to avoid PyTorch memory overhead.
Uses httpx (already a dependency) to call the Gemini REST API directly.
Keeps 384 dimensions to match the existing Supabase vector(384) schema.
"""
import httpx
from app.core.config import settings

EMBEDDING_DIM = 384
_EMBED_URL = (
    "https://generativelanguage.googleapis.com/v1beta"
    "/models/text-embedding-004:embedContent"
)


async def _embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            _EMBED_URL,
            params={"key": settings.gemini_key_extraction},
            json={
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": text}]},
                "outputDimensionality": EMBEDDING_DIM,
            },
        )
        resp.raise_for_status()
        return resp.json()["embedding"]["values"]


async def embed_text(text: str) -> list[float]:
    return await _embed(text)


async def embed_query(text: str) -> list[float]:
    return await _embed(text)
