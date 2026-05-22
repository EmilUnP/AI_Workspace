-- Cleanup: remove app tables created in the WRONG schema (eduator instead of public)
--
-- Run in pgAdmin Query Tool on database eduator_db BEFORE re-running 000_full_schema.sql
--
-- Does NOT drop the eduator schema itself (in case it existed for other reasons).
-- Only drops Eduator backend tables if they exist in eduator or public.

BEGIN;

SET search_path TO public;

DROP TABLE IF EXISTS
  eduator.teacher_chat_messages,
  eduator.teacher_chat_conversations,
  eduator.teacher_chat_assistants,
  eduator.lessons,
  eduator.exams,
  eduator.education_plans,
  eduator.api_access_log,
  eduator.user_api_keys,
  eduator.user_ai_provider_keys,
  eduator.ai_requests,
  eduator.documents,
  eduator.refresh_tokens,
  eduator.users,
  eduator.schema_migrations
CASCADE;

DROP TABLE IF EXISTS
  public.teacher_chat_messages,
  public.teacher_chat_conversations,
  public.teacher_chat_assistants,
  public.lessons,
  public.exams,
  public.education_plans,
  public.api_access_log,
  public.user_api_keys,
  public.user_ai_provider_keys,
  public.ai_requests,
  public.documents,
  public.refresh_tokens,
  public.users,
  public.schema_migrations
CASCADE;

COMMIT;

-- After this: run 000_full_schema.sql again (it now forces public schema)
