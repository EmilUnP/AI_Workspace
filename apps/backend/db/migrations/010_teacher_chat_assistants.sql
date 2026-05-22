-- Assistants (configured bots) vs conversations (chat threads).

ALTER TABLE teacher_chat_messages
  DROP CONSTRAINT IF EXISTS teacher_chat_messages_conversation_id_fkey;

CREATE TABLE IF NOT EXISTS teacher_chat_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_user_id TEXT NULL,
  title TEXT NOT NULL DEFAULT 'New Assistant',
  document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_chat_assistants_user_external_updated
  ON teacher_chat_assistants (user_id, external_user_id, updated_at DESC);

-- Already migrated: conversations table has assistant_id only.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teacher_chat_conversations'
      AND column_name = 'assistant_id'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO teacher_chat_assistants (
    id, user_id, external_user_id, title, document_ids, context, created_at, updated_at
  )
  SELECT
    c.id,
    c.user_id,
    c.external_user_id,
    c.title,
    c.document_ids,
    c.context,
    c.created_at,
    c.updated_at
  FROM teacher_chat_conversations c
  ON CONFLICT (id) DO NOTHING;

  CREATE TABLE IF NOT EXISTS teacher_chat_conversations_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID NOT NULL REFERENCES teacher_chat_assistants(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New chat',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  INSERT INTO teacher_chat_conversations_v2 (assistant_id, title, created_at, updated_at)
  SELECT a.id, 'Main chat', a.created_at, a.updated_at
  FROM teacher_chat_assistants a
  WHERE NOT EXISTS (
    SELECT 1 FROM teacher_chat_conversations_v2 t WHERE t.assistant_id = a.id
  );

  UPDATE teacher_chat_messages m
  SET conversation_id = t.id
  FROM teacher_chat_conversations_v2 t
  WHERE t.assistant_id = m.conversation_id;

  DELETE FROM teacher_chat_messages m
  WHERE NOT EXISTS (
    SELECT 1 FROM teacher_chat_conversations_v2 t WHERE t.id = m.conversation_id
  );

  DROP TABLE teacher_chat_conversations;
  ALTER TABLE teacher_chat_conversations_v2 RENAME TO teacher_chat_conversations;
END $$;

CREATE INDEX IF NOT EXISTS idx_teacher_chat_conversations_assistant_updated
  ON teacher_chat_conversations (assistant_id, updated_at DESC);

ALTER TABLE teacher_chat_messages
  ADD CONSTRAINT teacher_chat_messages_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES teacher_chat_conversations(id) ON DELETE CASCADE;
