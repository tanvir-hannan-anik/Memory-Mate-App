import os
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routes import conversations, chat, plans, recordings
from app.services.notifications import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Memoire API",
    description="Memory assistant backend for dementia patients",
    version="1.0.0",
    lifespan=lifespan,
)

# Hardcoded open CORS — allow_credentials=False is required when allow_origins=["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conversations.router)
app.include_router(chat.router)
app.include_router(plans.router)
app.include_router(recordings.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Memoire API"}


@app.get("/debug")
async def debug():
    result: dict = {}
    try:
        from app.db.supabase import get_supabase
        sb = get_supabase()
        sb.table("chat_sessions").select("id").limit(1).execute()
        result["supabase"] = "ok"
    except Exception as e:
        result["supabase"] = f"ERROR: {e}"
    return result
