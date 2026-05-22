-- Adds file_data to documents. Requires base schema (documents table) first.
-- Fresh database: run 000_full_schema.sql instead (it already includes file_data).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'documents'
  ) THEN
    ALTER TABLE public.documents
      ADD COLUMN IF NOT EXISTS file_data BYTEA;
  ELSE
    RAISE EXCEPTION 'Table public.documents does not exist. Run 000_full_schema.sql first.';
  END IF;
END $$;
