-- Lesson images/audio in PostgreSQL. Requires lessons table first.
-- Fresh database: run 000_full_schema.sql instead (it already includes this table).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lessons'
  ) THEN
    RAISE EXCEPTION 'Table public.lessons does not exist. Run 000_full_schema.sql first.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS lesson_media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, file_name)
);

CREATE INDEX IF NOT EXISTS idx_lesson_media_files_lesson_id ON lesson_media_files(lesson_id);
