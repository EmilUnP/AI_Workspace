ALTER TABLE api_access_log
  ADD COLUMN IF NOT EXISTS api_key_id UUID NULL REFERENCES user_api_keys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_api_access_log_user_api_key_created
  ON api_access_log (user_id, api_key_id, created_at DESC);
