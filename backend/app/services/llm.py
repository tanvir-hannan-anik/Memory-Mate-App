"""
Google Gemini 2.5 Flash — 4 separate API keys, each with its own free quota.

Key assignment:
  GEMINI_KEY_EXTRACTION → extract_conversation_info()
  GEMINI_KEY_CHAT       → rag_chat() + extract_date_intent()
  GEMINI_KEY_SUMMARY    → summarize_messages()
  GEMINI_KEY_NAMING     → generate_session_name()
"""
import asyncio
import json
import re
from datetime import datetime, timezone, timedelta
import google.generativeai as genai
from app.core.config import settings

GEMINI_MODEL = "gemini-2.5-flash"


def _generate_sync(api_key: str, system_instruction: str, prompt: str) -> str:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=system_instruction,
    )
    resp = model.generate_content(prompt)
    return resp.text.strip()


def _chat_sync(api_key: str, system_instruction: str, history: list[dict], user_message: str) -> str:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=system_instruction,
    )
    chat = model.start_chat(history=history)
    resp = chat.send_message(user_message)
    return resp.text.strip()


async def _generate(api_key: str, system_instruction: str, prompt: str) -> str:
    return await asyncio.to_thread(_generate_sync, api_key, system_instruction, prompt)


async def _chat(api_key: str, system_instruction: str, history: list[dict], user_message: str) -> str:
    return await asyncio.to_thread(_chat_sync, api_key, system_instruction, history, user_message)


# ── 1. Extract structured info from transcript ─────────────────────────────

EXTRACTION_SYSTEM = """You are an assistant helping dementia patients remember their conversations.
You will receive a diarized transcript. The FIRST speaker is always the patient.

Extract and return ONLY valid JSON (no markdown fences, no explanation) with this exact structure:
{
  "speakers": [
    {"label": "Speaker 1", "name": "...", "role": "..."}
  ],
  "people_met": [
    {"name": "...", "role": "..."}
  ],
  "summary": "A clear, simple summary of what was discussed (2-4 sentences)",
  "key_info": ["important fact 1", "important fact 2"],
  "plans": [
    {
      "title": "...",
      "description": "...",
      "plan_time": "ISO8601 datetime or null",
      "is_daily": false,
      "daily_time": "HH:MM or null"
    }
  ]
}

Rules:
- speakers: map each Speaker label to a real name if mentioned in conversation
- people_met: everyone the patient talked to (exclude the patient)
- key_info: medical info, personal details, important facts mentioned
- plans: any appointments, meetings, or tasks agreed upon
- If a value is unknown, use null
- Respond ONLY with the JSON object, nothing else"""


async def extract_conversation_info(transcript: str) -> dict:
    raw = await _generate(
        api_key=settings.gemini_key_extraction,
        system_instruction=EXTRACTION_SYSTEM,
        prompt=f"Transcript:\n\n{transcript}",
    )
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
    return json.loads(raw)


# ── 2. Generate chat session name ──────────────────────────────────────────

async def generate_session_name(first_query: str, language: str = 'en') -> str:
    lang_rule = (
        "Reply ONLY in Bangla (বাংলা). Do NOT use English words."
        if language == 'bn'
        else
        "Reply ONLY in English. Do NOT use Bangla words."
    )
    return await _generate(
        api_key=settings.gemini_key_naming,
        system_instruction=(
            f"Generate a short chat session name (3-5 words max) based on the user's first message. "
            f"{lang_rule} "
            "Return ONLY the name — no punctuation, no quotes, no explanation."
        ),
        prompt=first_query,
    )


# ── 3. Summarize old messages (rolling summary) ────────────────────────────

async def summarize_messages(existing_summary: str | None, messages_to_compress: list[dict]) -> str:
    conversation_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in messages_to_compress
    )
    if existing_summary:
        prompt = f"Existing summary:\n{existing_summary}\n\nNew messages to incorporate:\n{conversation_text}"
    else:
        prompt = f"Messages to summarize:\n{conversation_text}"

    return await _generate(
        api_key=settings.gemini_key_summary,
        system_instruction=(
            "You are summarizing a chat conversation for a dementia patient's memory-aid app. "
            "Create a concise, factual summary of what was discussed. "
            "If there's an existing summary, merge the new messages into it. "
            "Keep it under 300 words. "
            "Match the language of the conversation (Bangla or English). "
            "Return only the summary text, nothing else."
        ),
        prompt=prompt,
    )


# ── 4. Extract date intent from query ─────────────────────────────────────

DATE_EXTRACTION_SYSTEM = """You extract date/time references from user queries for a memory-assistant app.
Today's date and current time will be provided in the prompt.

Return ONLY valid JSON (no markdown, no explanation):
{
  "has_date": true or false,
  "start": "ISO8601 datetime or null",
  "end": "ISO8601 datetime or null"
}

Examples (assuming today is 2025-06-10):
- "yesterday" → {"has_date": true, "start": "2025-06-09T00:00:00", "end": "2025-06-09T23:59:59"}
- "গতকাল" (yesterday in Bangla) → same as above
- "পরশু" (day before yesterday) → {"has_date": true, "start": "2025-06-08T00:00:00", "end": "2025-06-08T23:59:59"}
- "last Monday" → {"has_date": true, "start": "2025-06-02T00:00:00", "end": "2025-06-02T23:59:59"}
- "গত সোমবার" (last Monday in Bangla) → same as above
- "10th April" → {"has_date": true, "start": "2025-04-10T00:00:00", "end": "2025-04-10T23:59:59"}
- "last week" → {"has_date": true, "start": "2025-06-03T00:00:00", "end": "2025-06-09T23:59:59"}
- "recently" or "a few days ago" → {"has_date": true, "start": "2025-06-03T00:00:00", "end": "2025-06-10T23:59:59"}
- "who is Dr. Karim" → {"has_date": false, "start": null, "end": null}
- "what medicine do I take" → {"has_date": false, "start": null, "end": null}

Bangla time words to handle:
- গতকাল = yesterday
- পরশু = day before yesterday
- গত সপ্তাহ = last week
- আজ = today
- গত [weekday] = last [weekday]
- কাল = yesterday (also can mean tomorrow — use context)"""


async def extract_date_intent(query: str) -> tuple[datetime, datetime] | None:
    """
    Returns (start_datetime, end_datetime) if query contains a date reference.
    Returns None if no date reference found.
    """
    now = datetime.now(timezone.utc)
    bd_now = now + timedelta(hours=6)

    prompt = (
        f"Today's date: {bd_now.strftime('%Y-%m-%d')} ({bd_now.strftime('%A')})\n"
        f"Current time: {bd_now.strftime('%H:%M')} (Bangladesh time)\n\n"
        f"User query: {query}"
    )

    try:
        raw = await _generate(
            api_key=settings.gemini_key_chat,
            system_instruction=DATE_EXTRACTION_SYSTEM,
            prompt=prompt,
        )
        raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
        data = json.loads(raw)

        if not data.get("has_date") or not data.get("start"):
            return None

        start = datetime.fromisoformat(data["start"]).replace(tzinfo=timezone.utc)
        end = datetime.fromisoformat(data["end"]).replace(tzinfo=timezone.utc)
        return (start, end)

    except Exception:
        return None


# ── 5. RAG chat response ───────────────────────────────────────────────────

def _build_rag_system(language: str) -> str:
    if language == 'bn':
        lang_rule = (
            "LANGUAGE (STRICTLY ENFORCED): Always respond in Bangla (বাংলা). "
            "Never switch to English under any circumstances. "
            "Stored data may be in English or Bangla — understand it in any language, but ALWAYS reply in Bangla."
        )
        no_data_reply = "আপনার সংরক্ষিত তথ্যে এ বিষয়ে কোনো রেকর্ড নেই।"
    else:
        lang_rule = (
            "LANGUAGE (STRICTLY ENFORCED): Always respond in English. "
            "Never switch to Bangla under any circumstances. "
            "Stored data may be in English or Bangla — understand it in any language, but ALWAYS reply in English."
        )
        no_data_reply = "I don't have any record of that in your saved data."

    return (
        "You are Memora, a personal memory-assistant for a dementia patient.\n"
        "Your sole purpose is to help the patient recall information from THEIR OWN data "
        "stored in this app — their recorded conversations, saved memories, and plans/reminders.\n\n"
        f"{lang_rule}\n\n"
        "═══ STRICT GROUNDING RULE (HIGHEST PRIORITY) ═══\n"
        "You are ONLY allowed to answer using the patient data provided in the context sections below.\n"
        "You MUST NOT use any general knowledge, outside facts, internet information, "
        "or anything not explicitly present in the patient's own data.\n"
        "If the patient's data does not contain enough information to answer, you MUST say:\n"
        f'  "{no_data_reply}"\n'
        "Do NOT guess, infer, or fill gaps with general knowledge.\n"
        "Do NOT answer questions about general facts, world events, medical advice, "
        "or anything unrelated to the patient's personal stored data.\n"
        "EXCEPTION: Simple conversational exchanges (greetings, thanks, how are you) "
        "may be answered warmly and briefly without data.\n"
        "═══════════════════════════════════════════════\n\n"
        "When answering from data:\n"
        "- Be warm, patient, and reassuring — like a caring family member\n"
        "- Keep answers short and simple\n"
        "- Always mention WHEN something happened (date from the record)\n"
        "- For plans/reminders, state the exact time and date from the record\n"
        "- If multiple records match, summarise all of them"
    )


async def rag_chat(
    user_query: str,
    session_summary: str | None,
    recent_messages: list[dict],
    rag_context: list[dict],
    plans_context: list[dict],
    language: str = 'en',
    profile_context: dict | None = None,
) -> str:
    context_parts = []

    # ── Patient profile ────────────────────────────────────────────────────
    if profile_context:
        lines = ["=== PATIENT PROFILE (WHO YOU ARE TALKING TO) ==="]
        if profile_context.get("name"):
            lines.append(f"Name: {profile_context['name']}")
        if profile_context.get("age"):
            lines.append(f"Age: {profile_context['age']}")
        if profile_context.get("phone"):
            lines.append(f"Phone: {profile_context['phone']}")
        contacts = profile_context.get("emergency_contacts") or []
        if contacts:
            lines.append("Emergency contacts:")
            for c in contacts:
                if c.get("name") or c.get("phone"):
                    lines.append(f"  - {c.get('name', '?')}: {c.get('phone', '?')}")
        caregivers = profile_context.get("caregivers") or []
        if caregivers:
            lines.append("Caregivers:")
            for cg in caregivers:
                if cg.get("name") or cg.get("phone"):
                    lines.append(f"  - {cg.get('name', '?')}: {cg.get('phone', '?')}")
        lines.append("=== END PATIENT PROFILE ===\n")
        context_parts.append("\n".join(lines))

    # ── Recorded conversations ─────────────────────────────────────────────
    if rag_context:
        context_parts.append("=== PATIENT'S RECORDED MEMORIES ===")
        for i, ctx in enumerate(rag_context, 1):
            date = ctx.get("created_at", "")[:10]
            people = ", ".join(p.get("name", "?") for p in (ctx.get("people_met") or []))
            source = ctx.get("_source", "")
            key_info = "; ".join(str(k) for k in (ctx.get("key_info") or []))
            context_parts.append(
                f"\n[Memory {i} — recorded on {date}"
                f"{', matched by date' if source == 'date' else ''}]\n"
                f"People involved: {people or 'not mentioned'}\n"
                f"Summary: {ctx.get('summary') or 'no summary'}\n"
                f"Key details: {key_info or 'none'}"
            )
        context_parts.append("=== END RECORDED MEMORIES ===\n")
    else:
        context_parts.append("=== PATIENT'S RECORDED MEMORIES ===\n[No relevant recorded memories found]\n=== END RECORDED MEMORIES ===\n")

    # ── Plans / reminders ──────────────────────────────────────────────────
    if plans_context:
        context_parts.append("=== PATIENT'S PLANS & REMINDERS ===")
        for p in plans_context:
            status = "✓ completed" if p.get("is_completed") else "pending"
            if p.get("is_daily") and p.get("daily_time"):
                timing = f"Daily at {p['daily_time']}"
            elif p.get("plan_time"):
                timing = p["plan_time"][:16].replace("T", " ")
            else:
                timing = "no specific time set"
            context_parts.append(
                f"- {p.get('title', 'Untitled')} [{status}] — {timing}"
                + (f"\n  Details: {p['description']}" if p.get("description") else "")
            )
        context_parts.append("=== END PLANS & REMINDERS ===\n")
    else:
        context_parts.append("=== PATIENT'S PLANS & REMINDERS ===\n[No plans or reminders found]\n=== END PLANS & REMINDERS ===\n")

    # ── Current session context ────────────────────────────────────────────
    if session_summary:
        context_parts.append(f"=== EARLIER IN THIS CONVERSATION ===\n{session_summary}\n=== END ===\n")

    full_system = _build_rag_system(language) + "\n\n" + "\n".join(context_parts)

    history = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": [m["content"]]}
        for m in recent_messages
    ]

    return await _chat(
        api_key=settings.gemini_key_chat,
        system_instruction=full_system,
        history=history,
        user_message=user_query,
    )
