from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime, time

# ── Conversations ──────────────────────────────

class PersonMet(BaseModel):
    name: str
    role: Optional[str] = None

class PlanExtracted(BaseModel):
    title: str
    description: Optional[str] = None
    plan_time: Optional[datetime] = None
    is_daily: bool = False
    daily_time: Optional[str] = None  # "HH:MM"

class ConversationOut(BaseModel):
    id: str
    audio_path: Optional[str]
    image_paths: list[str]
    raw_transcript: Optional[str]
    speakers: list[dict]
    people_met: list[dict]
    summary: Optional[str]
    key_info: list[str]
    plans_extracted: list[dict]
    created_at: str

# ── Plans ─────────────────────────────────────

class PlanCreate(BaseModel):
    title: str
    description: Optional[str] = None
    plan_time: Optional[datetime] = None
    is_daily: bool = False
    daily_time: Optional[str] = None  # "HH:MM"

class PlanOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    plan_time: Optional[str]
    is_daily: bool
    daily_time: Optional[str]
    is_completed: bool
    created_at: str

# ── Chat ──────────────────────────────────────

class ChatSessionOut(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str

class ChatMessageIn(BaseModel):
    content: str
    language: str = 'en'   # 'en' or 'bn' — from user profile

class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: str

class ChatResponse(BaseModel):
    session_id: str
    session_name: str
    reply: str
