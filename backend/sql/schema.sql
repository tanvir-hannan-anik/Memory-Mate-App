-- ============================================================
-- MEMORA — Complete Database Schema
-- Run once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable pgvector extension for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ──────────────────────────────────────────────────────────────
-- 1. CONVERSATIONS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT        NOT NULL,
    audio_path      TEXT,
    image_paths     TEXT[]      DEFAULT '{}',
    raw_transcript  TEXT,
    speakers        JSONB       DEFAULT '[]',
    people_met      JSONB       DEFAULT '[]',
    summary         TEXT,
    key_info        JSONB       DEFAULT '[]',
    plans_extracted JSONB       DEFAULT '[]',
    embedding       vector(384),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_user_idx ON conversations(user_id);
CREATE INDEX IF NOT EXISTS conversations_emb_idx  ON conversations
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ──────────────────────────────────────────────────────────────
-- 2. PLANS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          TEXT        NOT NULL,
    conversation_id  UUID        REFERENCES conversations(id) ON DELETE SET NULL,
    title            TEXT        NOT NULL,
    description      TEXT,
    plan_time        TIMESTAMPTZ,
    is_daily         BOOLEAN     DEFAULT false,
    daily_time       TIME,
    is_completed     BOOLEAN     DEFAULT false,
    notif_1hr_sent   BOOLEAN     DEFAULT false,
    notif_30min_sent BOOLEAN     DEFAULT false,
    notif_15min_sent BOOLEAN     DEFAULT false,
    created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plans_user_idx ON plans(user_id);

-- ──────────────────────────────────────────────────────────────
-- 3. CHAT SESSIONS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT        NOT NULL,
    name       TEXT        NOT NULL DEFAULT 'New Chat',
    summary    TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_idx
    ON chat_sessions(user_id, updated_at DESC);

-- ──────────────────────────────────────────────────────────────
-- 4. CHAT MESSAGES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID        NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_idx
    ON chat_messages(session_id, created_at);

-- ──────────────────────────────────────────────────────────────
-- 5. NOTIFICATIONS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    TEXT        NOT NULL,
    plan_id    UUID        REFERENCES plans(id) ON DELETE CASCADE,
    message    TEXT        NOT NULL,
    type       TEXT        NOT NULL CHECK (type IN ('1hr', '30min', '15min', 'manual')),
    is_read    BOOLEAN     DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);

-- Enable Realtime so frontend receives notifications instantly
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ──────────────────────────────────────────────────────────────
-- 6. VECTOR SIMILARITY SEARCH (for RAG chat)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_conversations(
    query_embedding vector(384),
    match_user_id   TEXT,
    match_count     INT DEFAULT 5
)
RETURNS TABLE (
    id             UUID,
    summary        TEXT,
    people_met     JSONB,
    key_info       JSONB,
    raw_transcript TEXT,
    created_at     TIMESTAMPTZ,
    similarity     FLOAT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id, c.summary, c.people_met, c.key_info,
        c.raw_transcript, c.created_at,
        1 - (c.embedding <=> query_embedding) AS similarity
    FROM conversations c
    WHERE c.user_id = match_user_id
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
