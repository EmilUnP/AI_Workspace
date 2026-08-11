-- Platform AI provider credentials, model catalog, workload policies, and audit log.
-- NOTE: FK to public.users is optional — some environments keep auth users elsewhere.
-- UUID columns still store actor IDs; constraints are added only when public.users exists.

-- IMPORTANT: pgAdmin may default search_path to schema "eduator" — force public.
SET search_path TO public;

CREATE TABLE IF NOT EXISTS ai_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('openrouter')),
  encrypted_key TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_tested_at TIMESTAMPTZ NULL,
  last_test_status TEXT NULL CHECK (last_test_status IS NULL OR last_test_status IN ('ok', 'error')),
  last_test_error TEXT NULL,
  updated_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ai_model_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'openrouter' CHECK (provider IN ('openrouter')),
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  context_length INTEGER NULL,
  input_modalities TEXT[] NOT NULL DEFAULT ARRAY['text']::TEXT[],
  output_modalities TEXT[] NOT NULL DEFAULT ARRAY['text']::TEXT[],
  supported_parameters TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  prompt_price_per_million NUMERIC(18, 8) NULL,
  completion_price_per_million NUMERIC(18, 8) NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_deprecated BOOLEAN NOT NULL DEFAULT FALSE,
  raw_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, model_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_model_catalog_enabled
  ON ai_model_catalog (provider, is_enabled)
  WHERE is_enabled = TRUE;

CREATE TABLE IF NOT EXISTS ai_workload_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workload TEXT NOT NULL UNIQUE CHECK (
    workload IN (
      'lightweight_text',
      'lesson_generation',
      'exam_generation',
      'education_plan_generation',
      'teacher_chat',
      'translation',
      'rag_query',
      'embeddings',
      'image_generation',
      'tts'
    )
  ),
  provider TEXT NOT NULL DEFAULT 'openrouter' CHECK (provider IN ('openrouter')),
  model_chain TEXT[] NOT NULL,
  require_structured_outputs BOOLEAN NOT NULL DEFAULT FALSE,
  prefer_zdr BOOLEAN NOT NULL DEFAULT TRUE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NULL,
  updated_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT ai_workload_policies_model_chain_len CHECK (
    cardinality(model_chain) >= 1 AND cardinality(model_chain) <= 8
  )
);

CREATE TABLE IF NOT EXISTS ai_provider_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NULL,
  before_state JSONB NULL,
  after_state JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_audit_log_created
  ON ai_provider_audit_log (created_at DESC);

-- Attach FKs only when public.users exists (avoids 42P01 on split/legacy DBs).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'ai_provider_credentials_updated_by_fkey'
    ) THEN
      ALTER TABLE ai_provider_credentials
        ADD CONSTRAINT ai_provider_credentials_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'ai_workload_policies_updated_by_fkey'
    ) THEN
      ALTER TABLE ai_workload_policies
        ADD CONSTRAINT ai_workload_policies_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'ai_provider_audit_log_actor_user_id_fkey'
    ) THEN
      ALTER TABLE ai_provider_audit_log
        ADD CONSTRAINT ai_provider_audit_log_actor_user_id_fkey
        FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Seed default OpenRouter workload policies (Gemini-only chains, same family as pre-OpenRouter).
INSERT INTO ai_workload_policies (workload, model_chain, require_structured_outputs, prefer_zdr, notes)
VALUES
  (
    'lightweight_text',
    ARRAY['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite', 'google/gemini-2.0-flash-001'],
    FALSE,
    TRUE,
    'Translation helpers, language detection, short rewrites (Gemini via OpenRouter)'
  ),
  (
    'translation',
    ARRAY['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite', 'google/gemini-2.0-flash-001'],
    FALSE,
    TRUE,
    'Plain-text translation (Gemini via OpenRouter)'
  ),
  (
    'rag_query',
    ARRAY['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite', 'google/gemini-2.0-flash-001'],
    FALSE,
    TRUE,
    'RAG query rewriting and language detection (Gemini via OpenRouter)'
  ),
  (
    'lesson_generation',
    ARRAY['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite', 'google/gemini-2.5-pro'],
    TRUE,
    TRUE,
    'Structured lesson JSON generation (Gemini via OpenRouter)'
  ),
  (
    'exam_generation',
    ARRAY['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite', 'google/gemini-2.5-pro'],
    TRUE,
    TRUE,
    'Structured exam JSON generation and translation (Gemini via OpenRouter)'
  ),
  (
    'education_plan_generation',
    ARRAY['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite', 'google/gemini-2.5-pro'],
    TRUE,
    TRUE,
    'Structured education plan JSON (Gemini via OpenRouter)'
  ),
  (
    'teacher_chat',
    ARRAY['google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite', 'google/gemini-2.0-flash-001'],
    FALSE,
    TRUE,
    'Teacher assistant chat (Gemini via OpenRouter)'
  ),
  (
    'embeddings',
    ARRAY['google/gemini-embedding-001'],
    FALSE,
    TRUE,
    'Document/query embeddings — Gemini embedding-001 (768-dim compatible)'
  ),
  (
    'image_generation',
    ARRAY['google/gemini-2.5-flash-image', 'google/gemini-2.5-flash-image-preview'],
    FALSE,
    TRUE,
    'Lesson image generation (Gemini image models via OpenRouter)'
  ),
  (
    'tts',
    ARRAY['google/gemini-3.1-flash-tts-preview', 'google/gemini-2.5-flash-preview-tts', 'google/gemini-2.5-pro-preview-tts'],
    FALSE,
    TRUE,
    'Lesson TTS (Gemini TTS via OpenRouter; use Gemini voices e.g. Zephyr)'
  )
ON CONFLICT (workload) DO UPDATE
SET
  model_chain = EXCLUDED.model_chain,
  require_structured_outputs = EXCLUDED.require_structured_outputs,
  prefer_zdr = EXCLUDED.prefer_zdr,
  notes = EXCLUDED.notes,
  updated_at = NOW();
