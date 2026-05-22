ALTER TABLE teacher_chat_conversations
  ADD COLUMN IF NOT EXISTS external_user_id TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_chat_conversations_user_external_updated
  ON teacher_chat_conversations (user_id, external_user_id, updated_at DESC);
