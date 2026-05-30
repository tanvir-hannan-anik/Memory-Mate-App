# 🧠 Memoire — Backend API

Memory assistant for dementia patients. **100% free APIs** — no credit card needed.

| Service | What it does | Cost |
|---|---|---|
| **Gladia** | Bangla voice transcription + speaker diarization | 10 hrs/month free |
| **Gemini 2.5 Flash ×4** | Extraction, chat, summarization, naming | 250 req/day each = 1000/day total |
| **all-MiniLM-L6-v2** | RAG embeddings (runs locally on your server) | Free forever |
| **Supabase** | Database + file storage + realtime notifications | Free tier |

---

## Project Structure

```
memoire/
├── app/
│   ├── main.py                   # FastAPI app + notification scheduler startup
│   ├── core/config.py            # All environment settings
│   ├── db/supabase.py            # Supabase client singleton
│   ├── models/schemas.py         # Pydantic request/response models
│   ├── services/
│   │   ├── gladia.py             # Bangla transcription + speaker diarization
│   │   ├── llm.py                # Gemini 2.5 Flash (4 keys × 4 tasks)
│   │   ├── embeddings.py         # Local all-MiniLM-L6-v2 (384-dim)
│   │   ├── storage.py            # Supabase Storage (audio + images)
│   │   └── notifications.py      # APScheduler (1hr / 30min / 15min alerts)
│   └── api/routes/
│       ├── conversations.py      # Voice pipeline endpoint
│       ├── chat.py               # RAG chatbot + session management
│       └── plans.py              # Manual plans/tasks CRUD
├── sql/
│   └── schema.sql                # ← Run this FIRST in Supabase
└── .env.example                  # Copy to .env and fill in your keys
```

---

## Step-by-Step Setup

### STEP 1 — Create your Supabase project

1. Go to **https://supabase.com** and click **Start your project**
2. Sign up / log in with GitHub or email
3. Click **New project**, give it a name (e.g. `memoire`), choose a region, set a database password → **Create new project**
4. Wait ~2 minutes for it to provision

---

### STEP 2 — Run the database schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `sql/schema.sql` from this project, copy its entire contents
4. Paste into the SQL editor and click **Run** (or press Ctrl+Enter)
5. You should see "Success. No rows returned" — that means it worked

---

### STEP 3 — Create the storage bucket

1. Click **Storage** in the left sidebar
2. Click **New bucket**
3. Name it exactly: `memoire-media`
4. Toggle **Public bucket** to OFF (keep it private)
5. Click **Save**

---

### STEP 4 — Enable Realtime notifications

1. Click **Database** in the left sidebar → then **Replication**
2. Under "Source", find the `notifications` table
3. Toggle it ON
4. That's it — your frontend can now subscribe to live notification events

---

### STEP 5 — Get your Supabase keys

1. Click **Settings** (gear icon) → **API**
2. Copy two values:
   - **Project URL** → this is your `SUPABASE_URL`
   - **service_role** key (under "Project API keys", click reveal) → this is your `SUPABASE_SERVICE_KEY`
   
⚠️ Never expose the service_role key on the frontend. It's backend-only.

---

### STEP 6 — Get your Gladia key

1. Go to **https://app.gladia.io** and sign up (free)
2. After login, go to **API Keys** → copy your key
3. Free plan = **10 hours of transcription per month**

---

### STEP 7 — Get 4 Gemini API keys (4 different Google accounts)

Each key gives you **250 free requests/day** = 1000 total across all 4 functions.

For each key:
1. Go to **https://aistudio.google.com**
2. Sign in with a Google account (use a different account for each key)
3. Click **Get API key** → **Create API key**
4. Copy the key

Assign them like this in your `.env`:
```
GEMINI_KEY_EXTRACTION = key from account 1  (used when processing recordings)
GEMINI_KEY_CHAT       = key from account 2  (used when patient chats)
GEMINI_KEY_SUMMARY    = key from account 3  (used to compress old chat history)
GEMINI_KEY_NAMING     = key from account 4  (used to name new chat sessions)
```

---

### STEP 8 — Configure your .env

```bash
cp .env.example .env
```

Open `.env` and fill in all values from steps 5–7.

---

### STEP 9 — Install and run

```bash
pip install -r requirements.txt
# First run downloads all-MiniLM-L6-v2 (~90MB) — only happens once

uvicorn app.main:app --reload --port 8000
```

API docs (auto-generated): **http://localhost:8000/docs**

---

## API Reference

### 🎙️ Voice Conversations

#### `POST /conversations/upload`
Full pipeline: upload → transcribe → extract → embed → store.

**Form data:**
| Field | Type | Notes |
|---|---|---|
| `user_id` | string | From Supabase Auth |
| `audio` | file | .webm / .mp3 / .wav |
| `images` | file[] | Optional, multiple allowed |

**Response:**
```json
{
  "id": "uuid",
  "raw_transcript": "Speaker 1: আমার নাম রাহেলা...\nSpeaker 2: আমি ডাক্তার করিম...",
  "speakers": [
    {"label": "Speaker 1", "name": "রাহেলা", "role": "patient"},
    {"label": "Speaker 2", "name": "ডাক্তার করিম", "role": "doctor"}
  ],
  "people_met": [{"name": "ডাক্তার করিম", "role": "doctor"}],
  "summary": "রাহেলা ডাক্তার করিমের সাথে কথা বললেন...",
  "key_info": ["Blood pressure is normal", "Next appointment in 2 weeks"],
  "plans_extracted": [
    {"title": "Doctor appointment", "plan_time": "2025-06-15T10:00:00", "is_daily": false}
  ]
}
```

#### `GET /conversations/{user_id}`
List all conversations, newest first.

#### `GET /conversations/{user_id}/{conversation_id}`
Full detail with signed audio + image URLs (expire in 1 hour).

---

### 🤖 RAG Chatbot

#### `POST /chat/sessions/{user_id}` — Create new session
#### `GET /chat/sessions/{user_id}` — List all sessions
#### `DELETE /chat/sessions/{session_id}` — Delete session

#### `POST /chat/{session_id}/message`
Send a message, get a response.

```json
{ "content": "গতকাল আমি কার সাথে কথা বলেছিলাম?" }
```

Response:
```json
{
  "session_id": "uuid",
  "session_name": "গতকালের কথোপকথন",
  "reply": "গতকাল আপনি ডাক্তার করিমের সাথে কথা বলেছিলেন..."
}
```

**Memory system:**
- Last **15 Q&A pairs** kept as full messages
- Older messages → compressed into **rolling summary** via Gemini (GEMINI_KEY_SUMMARY)
- Session name auto-generated from first message via Gemini (GEMINI_KEY_NAMING)

#### `GET /chat/{session_id}/messages` — Full message history

---

### 🔔 Plans & Tasks

#### `GET /plans/{user_id}` — List plans (`?include_completed=true` for all)

#### `POST /plans/{user_id}` — Create manual plan

One-time:
```json
{
  "title": "Doctor appointment",
  "plan_time": "2025-06-15T10:00:00+06:00",
  "is_daily": false
}
```

Daily recurring:
```json
{
  "title": "Take morning medicine",
  "is_daily": true,
  "daily_time": "08:30"
}
```

#### `PATCH /plans/{plan_id}/complete` — Mark done
#### `DELETE /plans/{plan_id}` — Delete

---

## Notifications (Supabase Realtime)

Notifications fire at **1hr, 30min, 15min** before each plan. Your friend subscribes on the frontend like this:

```javascript
const channel = supabase
  .channel('user-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    showNotification(payload.new.message)
  })
  .subscribe()
```

---

## Notes for the Frontend Developer

- All `user_id` values = Supabase Auth `user.id` after login
- Audio/image URLs expire after **1 hour** — don't cache them, re-fetch when needed
- Send `plan_time` with Bangladesh timezone offset: `+06:00`
- Use the **anon key** (not service_role) for the Realtime subscription on frontend
- The anon key is under Supabase → Settings → API → "anon public"
