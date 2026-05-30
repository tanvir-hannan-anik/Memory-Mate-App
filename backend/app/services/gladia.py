"""
Gladia Solaria-1 — Bangla-capable transcription with speaker diarization.
Docs: https://docs.gladia.io
"""
import httpx
import asyncio
from app.core.config import settings

GLADIA_BASE = "https://api.gladia.io/v2"

HEADERS = {
    "x-gladia-key": settings.gladia_api_key,
    "Content-Type": "application/json",
}


async def transcribe_audio(audio_bytes: bytes, filename: str) -> tuple[str, list]:
    """
    Upload audio to Gladia, request diarization, poll until done.
    Returns (formatted_transcript, utterances):
      - formatted_transcript: "Speaker 1: text\\nSpeaker 2: text"
      - utterances: raw Gladia utterance dicts with speaker, text, start, end
    """
    async with httpx.AsyncClient(timeout=120) as client:
        # 1. Upload the audio file
        upload_resp = await client.post(
            f"{GLADIA_BASE}/upload",
            headers={"x-gladia-key": settings.gladia_api_key},
            files={"audio": (filename, audio_bytes, "audio/webm")},
        )
        upload_resp.raise_for_status()
        audio_url = upload_resp.json()["audio_url"]

        # 2. Submit transcription request with diarization
        transcription_resp = await client.post(
            f"{GLADIA_BASE}/pre-recorded",
            headers=HEADERS,
            json={
                "audio_url": audio_url,
                "diarization": True,
                "diarization_config": {
                    "number_of_speakers": None,   # auto-detect
                    "min_speakers": 1,
                    "max_speakers": 6,
                },
                "language_config": {
                    "languages": ["bn", "en"],    # Bengali + English code-switching
                    "code_switching": True,
                },
            },
        )
        transcription_resp.raise_for_status()
        result_url = transcription_resp.json()["result_url"]

        # 3. Poll until complete (max 5 min)
        for _ in range(60):
            await asyncio.sleep(5)
            poll = await client.get(result_url, headers=HEADERS)
            poll.raise_for_status()
            data = poll.json()
            if data.get("status") == "done":
                utterances = _get_utterances(data)
                return _format_transcript(data), utterances
            if data.get("status") == "error":
                raise RuntimeError(f"Gladia error: {data.get('error_message')}")

    raise TimeoutError("Gladia transcription timed out after 5 minutes")


def _get_utterances(data: dict) -> list:
    return (
        data.get("result", {})
        .get("transcription", {})
        .get("utterances", [])
    )


def _format_transcript(data: dict) -> str:
    """
    Convert Gladia diarized output into:
        Speaker 1: ...
        Speaker 2: ...
    """
    utterances = (
        data.get("result", {})
        .get("transcription", {})
        .get("utterances", [])
    )

    if not utterances:
        # Fallback: plain transcript
        return data.get("result", {}).get("transcription", {}).get("full_transcript", "")

    lines = []
    for u in utterances:
        speaker = f"Speaker {u.get('speaker', 0) + 1}"
        text = u.get("text", "").strip()
        if text:
            lines.append(f"{speaker}: {text}")

    return "\n".join(lines)
