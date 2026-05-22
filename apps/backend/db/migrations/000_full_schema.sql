-- Eduator backend — full database schema (structure only, no seed data)
--
-- Run once on an EMPTY PostgreSQL database:
--   psql "postgres://USER:PASSWORD@HOST:5432/eduator_clean" -f apps/backend/db/migrations/000_full_schema.sql
--
-- Or from apps/backend:
--   psql "$DATABASE_URL" -f db/migrations/000_full_schema.sql
--
-- Safe to re-run (idempotent). Marks migrations 001–012 as applied so
-- `npm run db:migrate` skips them afterward.
-- (000_full_schema.sql itself is recorded by the migrate runner.)

BEGIN;

-- IMPORTANT: always create tables in public (pgAdmin may default to another schema)
SET search_path TO public;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Core auth & users
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  manual_note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Documents & RAG
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'uploaded',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  local_path TEXT,
  extracted_text TEXT,
  text_chunks JSONB,
  chunk_embeddings JSONB,
  content_language TEXT,
  text_extracted_at TIMESTAMPTZ,
  file_hash TEXT,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  avg_chunk_size INTEGER NOT NULL DEFAULT 0,
  quality_status TEXT,
  quality_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_owner_user_id ON documents(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents(file_hash);

-- ---------------------------------------------------------------------------
-- AI
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id ON ai_requests(user_id);

CREATE TABLE IF NOT EXISTS user_ai_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  key_hint TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_ai_provider_keys_user_id
  ON user_ai_provider_keys(user_id);

-- ---------------------------------------------------------------------------
-- HTTP API keys & access log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id_active ON user_api_keys(user_id, is_active);

CREATE TABLE IF NOT EXISTS api_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key_id UUID NULL REFERENCES user_api_keys(id) ON DELETE SET NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_access_log_user_created
  ON api_access_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_access_log_user_path
  ON api_access_log (user_id, method, path);
CREATE INDEX IF NOT EXISTS idx_api_access_log_user_api_key_created
  ON api_access_log (user_id, api_key_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Lessons, exams, education plans
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS education_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  period_months INTEGER NOT NULL DEFAULT 1,
  sessions_per_week INTEGER NOT NULL DEFAULT 1,
  hours_per_session INTEGER NOT NULL DEFAULT 1,
  audience TEXT,
  document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_shared_with_students BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  grade_level TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  language TEXT NOT NULL DEFAULT 'en',
  is_published BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  grade_level TEXT,
  topic TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  mini_test JSONB,
  language TEXT NOT NULL DEFAULT 'en',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- AI Tutor (assistants → conversations → messages)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS teacher_chat_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Assistant',
  document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID NOT NULL REFERENCES teacher_chat_assistants(id) ON DELETE CASCADE,
  external_user_id TEXT NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES teacher_chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_chat_conversations_assistant_updated
  ON teacher_chat_conversations (assistant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_chat_conversations_assistant_external_updated
  ON teacher_chat_conversations (assistant_id, external_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_chat_messages_conversation_id
  ON teacher_chat_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Migration tracker (keeps npm run db:migrate in sync)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (id) VALUES
  ('001_init.sql'),
  ('002_ai_expansion.sql'),
  ('003_user_gemini_keys.sql'),
  ('003_users_manual_note.sql'),
  ('004_documents_rag_pipeline.sql'),
  ('005_user_api_keys.sql'),
  ('006_api_access_log.sql'),
  ('007_api_access_log_api_key_id.sql'),
  ('008_teacher_chat.sql'),
  ('009_teacher_chat_external_user.sql'),
  ('010_teacher_chat_assistants.sql'),
  ('011_teacher_chat_assistants_repair.sql'),
  ('012_external_user_on_conversations.sql')
ON CONFLICT (id) DO NOTHING;

COMMIT;
