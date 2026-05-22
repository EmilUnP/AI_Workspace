CREATE TABLE IF NOT EXISTS api_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_access_log_user_created ON api_access_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_access_log_user_path ON api_access_log (user_id, method, path);
