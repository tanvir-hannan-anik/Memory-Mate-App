import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routes import conversations, chat, plans
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

_raw = os.environ.get("ALLOWED_ORIGINS", "*")
_origins = [o.strip() for o in _raw.split(",")] if _raw != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,   # we use Authorization header, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(conversations.router)
app.include_router(chat.router)
app.include_router(plans.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Memoire API"}


@app.get("/debug")
async def debug():
    """Check all service connections — use this to diagnose deployment issues."""
    result: dict = {}
    try:
        from app.db.supabase import get_supabase
        sb = get_supabase()
        sb.table("chat_sessions").select("id").limit(1).execute()
        result["supabase"] = "ok"
    except Exception as e:
        result["supabase"] = f"ERROR: {e}"
    return result
