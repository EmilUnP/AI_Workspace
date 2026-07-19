ALTER TABLE api_access_log
  ADD COLUMN IF NOT EXISTS request_meta JSONB NULL;

CREATE INDEX IF NOT EXISTS idx_api_access_log_request_meta
  ON api_access_log USING GIN (request_meta)
  WHERE request_meta IS NOT NULL;
