"""
Gemini text-embedding-004 via the google-generativeai SDK.
Uses outputDimensionality=384 to match the Supabase vector(384) schema.
"""
import asyncio
import google.generativeai as genai
from app.core.config import settings

EMBEDDING_DIM = 384


def _embed_sync(text: str) -> list[float]:
    genai.configure(api_key=settings.gemini_key_extraction)
    result = genai.embed_content(
        model="models/gemini-embedding-001",
        content=text,
        output_dimensionality=EMBEDDING_DIM,
    )
    return result["embedding"]


async def embed_text(text: str) -> list[float]:
    return await asyncio.to_thread(_embed_sync, text)


async def embed_query(text: str) -> list[float]:
    return await asyncio.to_thread(_embed_sync, text)
