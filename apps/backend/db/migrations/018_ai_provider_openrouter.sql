-- Platform AI provider credentials, model catalog, workload policies, and audit log.

CREATE TABLE IF NOT EXISTS ai_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('openrouter')),
  encrypted_key TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_tested_at TIMESTAMPTZ NULL,
  last_test_status TEXT NULL CHECK (last_test_status IS NULL OR last_test_status IN ('ok', 'error')),
  last_test_error TEXT NULL,
  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
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
  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT ai_workload_policies_model_chain_len CHECK (
    cardinality(model_chain) >= 1 AND cardinality(model_chain) <= 8
  )
);

CREATE TABLE IF NOT EXISTS ai_provider_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NULL,
  before_state JSONB NULL,
  after_state JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_audit_log_created
  ON ai_provider_audit_log (created_at DESC);

-- Seed default OpenRouter workload policies (admin can edit later).
INSERT INTO ai_workload_policies (workload, model_chain, require_structured_outputs, prefer_zdr, notes)
VALUES
  (
    'lightweight_text',
    ARRAY['deepseek/deepseek-v4-flash', 'qwen/qwen3.6-35b-a3b', 'openai/gpt-5.4-nano'],
    FALSE,
    TRUE,
    'Translation helpers, language detection, short rewrites'
  ),
  (
    'translation',
    ARRAY['deepseek/deepseek-v4-flash', 'qwen/qwen3.6-35b-a3b', 'openai/gpt-5.4-nano'],
    FALSE,
    TRUE,
    'Plain-text translation'
  ),
  (
    'rag_query',
    ARRAY['deepseek/deepseek-v4-flash', 'qwen/qwen3.6-35b-a3b', 'openai/gpt-5.4-nano'],
    FALSE,
    TRUE,
    'RAG query rewriting and language detection'
  ),
  (
    'lesson_generation',
    ARRAY['qwen/qwen3.7-plus', 'deepseek/deepseek-v4-pro', 'openai/gpt-5.4-mini'],
    TRUE,
    TRUE,
    'Structured lesson JSON generation'
  ),
  (
    'exam_generation',
    ARRAY['qwen/qwen3.7-plus', 'deepseek/deepseek-v4-pro', 'openai/gpt-5.4-mini'],
    TRUE,
    TRUE,
    'Structured exam JSON generation and translation'
  ),
  (
    'education_plan_generation',
    ARRAY['qwen/qwen3.7-plus', 'deepseek/deepseek-v4-pro', 'openai/gpt-5.4-mini'],
    TRUE,
    TRUE,
    'Structured education plan JSON'
  ),
  (
    'teacher_chat',
    ARRAY['qwen/qwen3.7-plus', 'deepseek/deepseek-v4-pro', 'openai/gpt-5.4-mini'],
    FALSE,
    TRUE,
    'Teacher assistant chat with session stickiness'
  ),
  (
    'embeddings',
    ARRAY['google/gemini-embedding-001', 'openai/text-embedding-3-small'],
    FALSE,
    TRUE,
    'Document/query embeddings; prefer Gemini-001 for 768-dim compatibility'
  ),
  (
    'image_generation',
    ARRAY['openai/gpt-5-image-mini', 'google/gemini-2.5-flash-image'],
    FALSE,
    TRUE,
    'Lesson image generation via OpenRouter image-capable models'
  ),
  (
    'tts',
    ARRAY['openai/gpt-4o-mini-tts', 'openai/gpt-audio-mini'],
    FALSE,
    TRUE,
    'Lesson TTS via OpenRouter speech endpoint'
  )
ON CONFLICT (workload) DO NOTHING;
