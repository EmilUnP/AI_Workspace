# OpenRouter Multi-Model Migration

## Summary

Eduator **0.4.0** no longer calls Google Gemini APIs directly. All AI workloads route through a provider-neutral gateway backed by OpenRouter, with platform-admin control over the API key, model catalog, and per-workload fallback chains.

## What changed

- Platform OpenRouter key (encrypted in `ai_provider_credentials`, optional `OPENROUTER_API_KEY` env fallback)
- Workload policies in `ai_workload_policies`
- Synced model catalog in `ai_model_catalog`
- Admin API under `/v1/admin/ai-providers/*`
- Platform Owner UI at `/platform-owner/ai-providers`
- School-admin Gemini key UI/endpoints removed
- Public `/v1/auth/register` can only create `user` roles; operators are created via `/v1/admin/users`

## Default model chains (seeded, admin-editable)

Gemini-only via OpenRouter (same families as the pre-OpenRouter Gemini integration):

| Workload | Primary → fallbacks |
| --- | --- |
| lightweight_text / translation / rag_query / teacher_chat | `google/gemini-2.5-flash` → `google/gemini-2.5-flash-lite` → `google/gemini-2.0-flash-001` |
| lesson / exam / education plan | `google/gemini-2.5-flash` → `google/gemini-2.5-flash-lite` → `google/gemini-2.5-pro` |
| embeddings | `google/gemini-embedding-001` |
| image_generation | `google/gemini-2.5-flash-image` → `google/gemini-2.5-flash-image-preview` |
| tts | `google/gemini-3.1-flash-tts-preview` → `google/gemini-2.5-flash-preview-tts` → `google/gemini-2.5-pro-preview-tts` |

Catalog IDs and prices are refreshable via **Sync model catalog** and must not be hard-coded in feature services.

## Rollout

1. Restore/deploy apps and apply migrations through `018_ai_provider_openrouter.sql` (017 request_meta repair included).
2. Set `OPENROUTER_API_KEY` and preferably `AI_CREDENTIALS_ENCRYPTION_KEY` in backend `.env.local`.
3. Sign in as platform admin → **AI Providers** → save/test key → sync catalog.
4. Adjust workload policies if needed, then smoke-test lesson/exam/plan/chat/RAG/image/TTS.
5. Remove any leftover `GOOGLE_GEMINI_API_KEY` from deployment secrets after validation.

## Rollback

- Keep a DB backup before migration 018.
- To temporarily fall back to env-only operation, leave the DB credential empty and set `OPENROUTER_API_KEY`.
- Reverting code to a pre-OpenRouter commit also requires restoring Gemini env keys and the deleted Gemini adapter paths.

## Security notes

- Provider secrets are AES-256-GCM encrypted with `AI_CREDENTIALS_ENCRYPTION_KEY` (not the JWT secret when configured).
- Admin AI endpoints require JWT admin role and reject integration API keys.
- CORS is origin-restricted via `CORS_ORIGINS` (dev may allow local origins).
- Provider error messages are redacted before persistence/display.
