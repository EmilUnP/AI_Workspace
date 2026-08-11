-- LEGACY (pre-0.4.0): per-user provider keys table.
-- Unused by runtime after OpenRouter migration; kept for migration history.
-- Platform credentials live in ai_provider_credentials (018_ai_provider_openrouter.sql).

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
