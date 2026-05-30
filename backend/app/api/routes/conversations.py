"""
POST /conversations/upload
  - Accepts: audio file + optional images + user_id
  - Transcribes via Gladia (diarized, Bangla-capable)
  - Extracts structured info via Claude
  - Saves everything to Supabase
  - Returns full conversation record

GET /conversations/{user_id}
  - List all conversations for a user

GET /conversations/{user_id}/{conversation_id}
  - Get single conversation with signed URLs for media
"""
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.services import gladia, llm, embeddings, storage
from app.db.supabase import get_supabase

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("/upload")
async def upload_conversation(
    user_id: str = Form(...),
    audio: UploadFile = File(...),
    images: list[UploadFile] = File(default=[]),
):
    """
    Full pipeline:
      audio + images → transcribe → extract → embed → store
    """
    sb = get_supabase()
    conversation_id = str(uuid.uuid4())

    try:
        # 1. Read files
        audio_bytes = await audio.read()
        image_data = [(await img.read(), img.filename) for img in images]

        # 2. Upload audio to Supabase Storage
        audio_path = await storage.upload_audio(user_id, conversation_id, audio_bytes, audio.filename)

        # 3. Upload images
        image_paths = []
        for img_bytes, img_name in image_data:
            path = await storage.upload_image(user_id, conversation_id, img_bytes, img_name)
            image_paths.append(path)

        # 4. Transcribe with Gladia (diarized, Bangla + English)
        raw_transcript = await gladia.transcribe_audio(audio_bytes, audio.filename)

        # 5. Extract structured info with Claude
        extracted = await llm.extract_conversation_info(raw_transcript)

        # 6. Generate embedding for RAG
        embed_text = f"{extracted.get('summary', '')} {' '.join(extracted.get('key_info', []))}"
        embedding = await embeddings.embed_text(embed_text)

        # 7. Save conversation to DB
        conversation_row = {
            "id": conversation_id,
            "user_id": user_id,
            "audio_path": audio_path,
            "image_paths": image_paths,
            "raw_transcript": raw_transcript,
            "speakers": extracted.get("speakers", []),
            "people_met": extracted.get("people_met", []),
            "summary": extracted.get("summary"),
            "key_info": extracted.get("key_info", []),
            "plans_extracted": extracted.get("plans", []),
            "embedding": embedding,
        }
        insert_result = sb.table("conversations").insert(conversation_row).execute()
        saved_row = insert_result.data[0] if insert_result.data else conversation_row

        # 8. Save extracted plans to plans table
        plans = extracted.get("plans", [])
        for plan in plans:
            sb.table("plans").insert({
                "user_id": user_id,
                "conversation_id": conversation_id,
                "title": plan.get("title", "Untitled plan"),
                "description": plan.get("description"),
                "plan_time": plan.get("plan_time"),
                "is_daily": plan.get("is_daily", False),
                "daily_time": plan.get("daily_time"),
            }).execute()

        return {
            "id": conversation_id,
            "audio_path": audio_path,
            "image_paths": image_paths,
            "raw_transcript": raw_transcript,
            "speakers": extracted.get("speakers", []),
            "people_met": extracted.get("people_met", []),
            "summary": extracted.get("summary"),
            "key_info": extracted.get("key_info", []),
            "plans_extracted": plans,
            "created_at": saved_row.get("created_at"),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}")
async def list_conversations(user_id: str):
    """List all conversations for a user, newest first."""
    sb = get_supabase()
    result = (
        sb.table("conversations")
        .select("id, people_met, summary, key_info, plans_extracted, audio_path, image_paths, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.get("/{user_id}/{conversation_id}")
async def get_conversation(user_id: str, conversation_id: str):
    """Get full conversation detail with signed media URLs."""
    sb = get_supabase()
    result = (
        sb.table("conversations")
        .select("*")
        .eq("id", conversation_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv = result.data

    # Generate signed URLs for media (1 hour expiry)
    if conv.get("audio_path"):
        conv["audio_url"] = storage.get_signed_url(conv["audio_path"])
    conv["image_urls"] = [
        storage.get_signed_url(p) for p in (conv.get("image_paths") or [])
    ]
    # Remove raw storage paths from response
    conv.pop("embedding", None)

    return conv
