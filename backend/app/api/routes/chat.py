"""
Chat routes — Supabase-persisted sessions and messages.

POST   /chat/sessions/{user_id}     — create session
GET    /chat/sessions/{user_id}     — list sessions
DELETE /chat/sessions/{session_id}  — delete session
POST   /chat/{session_id}/message   — send message, get Gemini RAG reply
GET    /chat/{session_id}/messages  — message history
"""
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatMessageIn
from app.services import llm, embeddings
from app.db.supabase import get_supabase

router = APIRouter(prefix="/chat", tags=["chat"])

RECENT_MESSAGES_LIMIT = 15


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _session_view(s: dict) -> dict:
    return {
        "id":         s["id"],
        "name":       s["name"],
        "created_at": s["created_at"],
        "updated_at": s["updated_at"],
    }


# ── Session management ─────────────────────────────────────────────────────

@router.post("/sessions/{user_id}")
async def create_session(user_id: str):
    db = get_supabase()
    record = {
        "id":       str(uuid.uuid4()),
        "user_id":  user_id,
        "name":     "New Chat",
        "summary":  None,
    }
    result = db.table("chat_sessions").insert(record).execute()
    return _session_view(result.data[0])


@router.get("/sessions/{user_id}")
async def list_sessions(user_id: str):
    db = get_supabase()
    result = (
        db.table("chat_sessions")
        .select("id, name, created_at, updated_at")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    db = get_supabase()
    db.table("chat_sessions").delete().eq("id", session_id).execute()
    return {"deleted": True}


@router.get("/{session_id}/messages")
async def get_messages(session_id: str):
    db = get_supabase()
    sess = db.table("chat_sessions").select("id").eq("id", session_id).execute()
    if not sess.data:
        raise HTTPException(status_code=404, detail="Session not found")
    result = (
        db.table("chat_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data


# ── Messaging ──────────────────────────────────────────────────────────────

@router.post("/{session_id}/message")
async def send_message(session_id: str, body: ChatMessageIn):
    db = get_supabase()

    # Load session
    sess_result = db.table("chat_sessions").select("*").eq("id", session_id).execute()
    if not sess_result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sess_result.data[0]

    # Resolve language early so it applies everywhere in this request
    language = body.language if body.language in ('en', 'bn') else 'en'

    # Load all messages for rolling-summary window
    msgs_result = (
        db.table("chat_messages")
        .select("role, content, created_at")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )
    all_messages = msgs_result.data

    pairs_limit     = RECENT_MESSAGES_LIMIT * 2
    old_messages    = all_messages[:-pairs_limit] if len(all_messages) > pairs_limit else []
    recent_messages = all_messages[-pairs_limit:]  if len(all_messages) > pairs_limit else all_messages

    # Compress old messages into rolling summary
    current_summary = session.get("summary")
    if old_messages:
        compressed = [{"role": m["role"], "content": m["content"]} for m in old_messages]
        current_summary = await llm.summarize_messages(current_summary, compressed)
        db.table("chat_sessions").update({"summary": current_summary}).eq("id", session_id).execute()

    # Persist user message
    db.table("chat_messages").insert({
        "id":         str(uuid.uuid4()),
        "session_id": session_id,
        "role":       "user",
        "content":    body.content,
    }).execute()

    # Retrieve relevant past conversations via vector similarity search
    try:
        query_embedding = await embeddings.embed_query(body.content)
        rag_result = db.rpc(
            "match_conversations",
            {
                "query_embedding": query_embedding,
                "match_user_id": session["user_id"],
                "match_count": 4,
            }
        ).execute()
        rag_context = [
            r for r in (rag_result.data or [])
            if (r.get("similarity") or 0) > 0.25
        ]
    except Exception:
        rag_context = []

    # Fetch user's plans as additional context (past 7 days + next 30 days + all daily)
    try:
        now        = datetime.now(timezone.utc)
        week_ago   = (now - timedelta(days=7)).isoformat()
        month_ahead = (now + timedelta(days=30)).isoformat()

        timed_plans = (
            db.table("plans")
            .select("title, description, plan_time, is_daily, daily_time, is_completed")
            .eq("user_id", session["user_id"])
            .gte("plan_time", week_ago)
            .lte("plan_time", month_ahead)
            .order("plan_time", desc=False)
            .limit(15)
            .execute()
        ).data or []

        daily_plans = (
            db.table("plans")
            .select("title, description, plan_time, is_daily, daily_time, is_completed")
            .eq("user_id", session["user_id"])
            .eq("is_daily", True)
            .limit(10)
            .execute()
        ).data or []

        # Merge, deduplicate by title+time key
        seen: set[str] = set()
        plans_context: list[dict] = []
        for p in timed_plans + daily_plans:
            key = f"{p.get('title')}|{p.get('plan_time')}|{p.get('daily_time')}"
            if key not in seen:
                seen.add(key)
                plans_context.append(p)
    except Exception:
        plans_context = []

    # Call Gemini RAG — enforce user's language preference
    recent_for_gemini = [{"role": m["role"], "content": m["content"]} for m in recent_messages]
    reply = await llm.rag_chat(
        user_query=body.content,
        session_summary=current_summary,
        recent_messages=recent_for_gemini,
        rag_context=rag_context,
        plans_context=plans_context,
        language=language,
    )

    # Persist assistant reply
    db.table("chat_messages").insert({
        "id":         str(uuid.uuid4()),
        "session_id": session_id,
        "role":       "assistant",
        "content":    reply,
    }).execute()

    # Auto-name session on the very first message
    session_name  = session["name"]
    update_fields: dict = {"updated_at": _now()}
    if session_name == "New Chat" and len(all_messages) == 0:
        session_name = await llm.generate_session_name(body.content, language=language)
        update_fields["name"] = session_name

    db.table("chat_sessions").update(update_fields).eq("id", session_id).execute()

    return {
        "session_id":        session_id,
        "session_name":      session_name,
        "reply":             reply,
        "retrieval_sources": [],
    }
