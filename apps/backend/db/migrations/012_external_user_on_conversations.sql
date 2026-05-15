-- external_user_id belongs on chat threads (conversations), not on assistants.
-- In-app threads use NULL; third-party integrators may set it when creating a conversation
-- (optional — conversation UUID is the primary session handle).

ALTER TABLE teacher_chat_conversations
  ADD COLUMN IF NOT EXISTS external_user_id TEXT NULL;

UPDATE teacher_chat_conversations c
SET external_user_id = a.external_user_id
FROM teacher_chat_assistants a
WHERE c.assistant_id = a.id
  AND c.external_user_id IS NULL
  AND a.external_user_id IS NOT NULL;

ALTER TABLE teacher_chat_assistants
  DROP COLUMN IF EXISTS external_user_id;

DROP INDEX IF EXISTS idx_teacher_chat_assistants_user_external_updated;

CREATE INDEX IF NOT EXISTS idx_teacher_chat_conversations_assistant_external_updated
  ON teacher_chat_conversations (assistant_id, external_user_id, updated_at DESC);
