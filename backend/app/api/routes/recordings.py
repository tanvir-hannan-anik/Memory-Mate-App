"""
POST /recordings/transcribe
  - Accepts multipart/form-data: audio file + recording_id, patient_id, duration, title
  - Transcribes via Gladia (diarized, Bangla-capable)
  - Extracts structured info via Gemini
  - Saves conversation + plans to Supabase
  - Returns transcript turns + speakers + summary + plans for frontend to write to Firestore
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from app.services import gladia, llm, embeddings
from app.db.supabase import get_supabase

router = APIRouter(prefix="/recordings", tags=["recordings"])

SPEAKER_COLORS = ["#3771C8", "#1E6E72", "#7A5AE0", "#9C5A12", "#3F8A5C"]


@router.post("/transcribe")
async def transcribe_recording(
    audio: UploadFile = File(...),
    recording_id: str = Form(...),
    patient_id: str = Form(...),
    duration: int = Form(0),
    title: str = Form("Voice memo"),
):
    sb = get_supabase()
    conversation_id = str(uuid.uuid4())

    try:
        # 1. Read audio bytes directly from the uploaded file
        audio_bytes = await audio.read()
        filename = audio.filename or f"{recording_id}.webm"
        if len(audio_bytes) == 0:
            raise ValueError("Received empty audio file")

        # 2. Transcribe with Gladia → formatted text + raw utterances
        try:
            raw_transcript, utterances = await gladia.transcribe_audio(audio_bytes, filename)
        except Exception as e:
            raise RuntimeError(f"Gladia transcription failed: {e}") from e

        if not raw_transcript.strip():
            raw_transcript = "Speaker 1: (no speech detected)"
            utterances = []

        # 3. Extract structured info (speakers, people_met, summary, key_info, plans)
        try:
            extracted = await llm.extract_conversation_info(raw_transcript)
        except Exception as e:
            raise RuntimeError(f"Gemini extraction failed: {e}") from e

        # 4. Build speaker label → name map from extraction result
        speaker_name_map: dict[str, str] = {}
        for sp in extracted.get("speakers", []):
            label = sp.get("label", "")
            name = sp.get("name") or label
            if label:
                speaker_name_map[label] = name

        # 5. Build transcript turns from Gladia utterances
        speaker_turn_counts: dict[str, int] = {}
        turns = []
        for i, utt in enumerate(utterances):
            speaker_label = f"Speaker {utt.get('speaker', 0) + 1}"
            speaker_name = speaker_name_map.get(speaker_label, speaker_label)
            speaker_turn_counts[speaker_name] = speaker_turn_counts.get(speaker_name, 0) + 1
            turns.append({
                "id": f"turn_{i}",
                "speaker_label": speaker_label,
                "speaker_name": speaker_name,
                "text": utt.get("text", "").strip(),
                "timestamp": int(utt.get("start", 0)),
                "emotion": "Calm",
            })

        # 6. Build speakers list with colours and turn counts
        speakers = []
        for i, sp in enumerate(extracted.get("speakers", [])):
            name = sp.get("name") or sp.get("label") or f"Speaker {i + 1}"
            speakers.append({
                "id": f"sp_{sp.get('label', f'Speaker {i + 1}')}",
                "name": name,
                "role": sp.get("role", ""),
                "color": SPEAKER_COLORS[i % len(SPEAKER_COLORS)],
                "turn_count": speaker_turn_counts.get(name, 0),
            })

        # 7. Convert LLM plans → DetectedPlan format for Transcript.tsx
        detected_plans = []
        for plan in extracted.get("plans", []):
            plan_date = None
            plan_time_str = None
            plan_time = plan.get("plan_time")
            if plan_time:
                try:
                    dt = datetime.fromisoformat(plan_time.replace("Z", "+00:00"))
                    plan_date = dt.strftime("%Y-%m-%d")
                    plan_time_str = dt.strftime("%H:%M")
                except Exception:
                    pass
            detected_plans.append({
                "text": plan.get("title", ""),
                "type": "appointment",
                "date": plan_date,
                "time": plan_time_str,
            })

        # 8. Generate embedding and persist conversation in Supabase
        embed_text = f"{extracted.get('summary', '')} {' '.join(extracted.get('key_info', []))}"
        try:
            embedding = await embeddings.embed_text(embed_text)
        except Exception as e:
            raise RuntimeError(f"Embedding failed: {e}") from e

        try:
            sb.table("conversations").insert({
                "id": conversation_id,
                "user_id": patient_id,
                "audio_path": f"direct_upload/{recording_id}/{filename}",
                "image_paths": [],
                "raw_transcript": raw_transcript,
                "speakers": extracted.get("speakers", []),
                "people_met": extracted.get("people_met", []),
                "summary": extracted.get("summary"),
                "key_info": extracted.get("key_info", []),
                "plans_extracted": extracted.get("plans", []),
                "embedding": embedding,
            }).execute()

            # 9. Save extracted plans to Supabase plans table
            for plan in extracted.get("plans", []):
                sb.table("plans").insert({
                    "user_id": patient_id,
                    "conversation_id": conversation_id,
                    "title": plan.get("title", "Untitled plan"),
                    "description": plan.get("description"),
                    "plan_time": plan.get("plan_time"),
                    "is_daily": plan.get("is_daily", False),
                    "daily_time": plan.get("daily_time"),
                }).execute()
        except Exception as e:
            raise RuntimeError(f"Supabase save failed: {e}") from e

        return {
            "conversation_id": conversation_id,
            "raw_transcript": raw_transcript,
            "turns": turns,
            "speakers": speakers,
            "summary": extracted.get("summary", ""),
            "key_info": extracted.get("key_info", []),
            "detected_plans": detected_plans,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
