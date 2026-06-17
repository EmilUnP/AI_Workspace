ALTER TABLE api_access_log
  ADD COLUMN IF NOT EXISTS error_message TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_api_access_log_user_status_created
  ON api_access_log (user_id, status_code, created_at DESC);
