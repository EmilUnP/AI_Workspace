-- Repair orphaned messages after partial migration (idempotent).

ALTER TABLE teacher_chat_messages
  DROP CONSTRAINT IF EXISTS teacher_chat_messages_conversation_id_fkey;

UPDATE teacher_chat_messages m
SET conversation_id = c.id
FROM teacher_chat_conversations c
WHERE c.assistant_id = m.conversation_id
  AND NOT EXISTS (
    SELECT 1 FROM teacher_chat_conversations x WHERE x.id = m.conversation_id
  );

INSERT INTO teacher_chat_conversations (assistant_id, title)
SELECT a.id, 'Recovered chat'
FROM teacher_chat_assistants a
WHERE EXISTS (
  SELECT 1 FROM teacher_chat_messages m WHERE m.conversation_id = a.id
)
AND NOT EXISTS (
  SELECT 1 FROM teacher_chat_conversations c WHERE c.assistant_id = a.id
);

UPDATE teacher_chat_messages m
SET conversation_id = c.id
FROM teacher_chat_conversations c
WHERE c.assistant_id = m.conversation_id
  AND NOT EXISTS (
    SELECT 1 FROM teacher_chat_conversations x WHERE x.id = m.conversation_id
  );

DELETE FROM teacher_chat_messages m
WHERE NOT EXISTS (
  SELECT 1 FROM teacher_chat_conversations c WHERE c.id = m.conversation_id
);

DROP TABLE IF EXISTS teacher_chat_conversations_v2;

ALTER TABLE teacher_chat_messages
  DROP CONSTRAINT IF EXISTS teacher_chat_messages_conversation_id_fkey;

ALTER TABLE teacher_chat_messages
  ADD CONSTRAINT teacher_chat_messages_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES teacher_chat_conversations(id) ON DELETE CASCADE;
