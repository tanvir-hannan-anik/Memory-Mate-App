# Memora — Full-Stack Application

A dementia companion app with AI-powered conversation recording, transcription, daily briefings, and caregiver coordination.

## Project Structure

```
DementiaNew/
├── UI prototype/          Original prototype files (reference)
├── frontend/              React + TypeScript + Tailwind (Vite)
├── backend/               FastAPI (Python)
└── supabase/
    └── schema.sql         Database schema
```

## Tech Stack

| Layer      | Technology                           |
|------------|--------------------------------------|
| Frontend   | React 18 + TypeScript + Vite         |
| Styling    | Tailwind CSS + CSS Variables         |
| Auth       | Supabase Auth (Email + Google OAuth) |
| Database   | Supabase (PostgreSQL)                |
| Backend    | FastAPI (Python 3.11+)               |
| Phone/Call | Twilio Programmable Voice            |
| AI         | OpenAI Whisper + GPT-4o-mini         |

---

## 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Storage** → create a bucket named `recordings` (set to **Public**)
4. Go to **Authentication → Providers** → enable **Google** (add OAuth credentials)
5. Copy your **Project URL** and **anon key** from Settings → API

---

## 2. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Fill in your Supabase URL and anon key in .env
npm install
npm run dev
```

### `.env` (frontend)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 3. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in all keys in .env
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### `.env` (backend)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

OPENAI_API_KEY=sk-xxxxxxx

APP_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

---

## 4. Twilio Phone Call Setup

1. Buy a Twilio phone number at [twilio.com](https://twilio.com)
2. Go to **Voice → TwiML Apps** → create a new app
3. Set the **Request URL** to: `https://your-backend.com/api/calls/twiml`
4. Set the **Recording Status Callback** to: `https://your-backend.com/api/calls/recording-callback`
5. For testing locally, use **ngrok**: `ngrok http 8000` and use the ngrok URL

---

## 5. Features

### Patient Interface
- **Today** — Daily briefing, task checklist, confirm understanding
- **Memories** — List of voice recordings with mood, summary, plans
- **Chat** — Memora AI companion (GPT-4o-mini powered)
- **Plans** — 14-day calendar with event management
- **Profile** — Caregiver code display, stats, settings
- **Emergency** — Hold-to-activate panic button with grounding exercise + 1-tap call

### Caregiver Interface
- **Dashboard** — Patient status hero, quick actions, activity feed
- **Location** — Live GPS map with safe-zone circle and movement timeline
- **Conversations** — All patient recordings with filters (Today, Flagged)
- **Remind** — Create reminders with push/voice/SMS delivery options
- **Profile** — Patient list, notification settings

### Shared Screens
- **Transcript Viewer** — Full transcript with speaker labels, emotion badges, AI insights, detected plans

### Phone Call Integration (Twilio)
- Initiate recorded outbound calls from patient or caregiver interface
- Automatic recording and transcription after call ends
- Call recording stored in Supabase, linked to patient profile

### AI Pipeline
1. Voice recorded in browser → uploaded to Supabase Storage
2. FastAPI background task → Whisper transcription
3. GPT-4o-mini → summary, detected plans, emotion analysis, mood
4. Results stored in `transcripts` table → displayed in app

---

## 6. Mobile Responsiveness

The app is designed mobile-first:
- Max width 430px shell centered on desktop with device-frame shadow
- CSS `env(safe-area-inset-*)` for iOS notch/home indicator
- `100dvh` for full dynamic viewport height
- No horizontal scroll, touch-optimised tap targets (52px min)
- Smooth native-like transitions and animations
