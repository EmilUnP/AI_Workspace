# Clean Backend Implementation Summary

This document summarizes what was implemented for the clean backend rebuild in `apps/clean-backend`.

## What Was Implemented

### 1) New Isolated Backend App
- Created a new workspace app: `apps/clean-backend`
- Added workspace and scripts in root `package.json`:
  - `dev:clean-backend`
  - `dev:clean`
  - `build:clean-backend`

### 2) Runtime Structure
- `src/server.ts`: bootstraps the backend server
- `src/app.ts`: registers plugins and routes, exposes `/health`
- `src/config/env.ts`: strict environment validation with Zod
- Plugins:
  - `src/plugins/db.ts` (PostgreSQL pool attachment)
  - `src/plugins/auth.ts` (JWT access-token auth middleware)
  - `src/plugins/error-handler.ts` (centralized error mapping)

### 3) PostgreSQL-First Database Layer
- Direct `pg` pool client (no Supabase)
- Migration runner:
  - `src/db/migrate.ts`
- Seed runner:
  - `src/db/seed.ts`
- Initial migration:
  - `db/migrations/001_init.sql`
- Phase-1 tables:
  - `users`
  - `refresh_tokens`
  - `documents`
  - `ai_requests`

### 4) JWT Local Authentication
- Email/password registration and login
- Password hashing with bcrypt
- Access + refresh token issuance and refresh flow
- Refresh token persistence with hash in DB
- Implemented in:
  - `src/services/auth.service.ts`
  - `src/utils/security.ts`
  - `src/routes/auth.ts`

### 5) Core API Modules (Backend-Only Scope)
- `src/routes/auth.ts`
  - `POST /v1/auth/register`
  - `POST /v1/auth/login`
  - `POST /v1/auth/refresh`
  - `GET /v1/auth/me`
- `src/routes/users.ts`
  - `GET /v1/users`
- `src/routes/documents.ts`
  - `POST /v1/documents`
  - `GET /v1/documents`
  - `GET /v1/documents/:id`
- `src/routes/ai.ts`
  - `POST /v1/ai/requests`
  - `GET /v1/ai/requests/:id`

Service/repository split was implemented for users, documents, AI, and refresh tokens.

### 6) Clean Boundary Enforcement
- Added forbidden-token/import check script:
  - `scripts/check-forbidden-imports.ts`
- Current checks block old patterns in clean-backend source:
  - Supabase references
  - `organization`, `organizations`, `organization_id`


### 7) AI Migration Expansion
- Added local AI stack in clean backend:
  - `src/ai/gemini.ts`
  - `src/services/document-rag.service.ts`
  - `src/services/teacher-chatbot.service.ts`
  - `src/services/lesson-ai.service.ts`
  - `src/services/exam-ai.service.ts`
  - `src/services/education-plan-ai.service.ts`
  - `src/services/translator-ai.service.ts`
  - `src/services/media-ai.service.ts`
- Added AI domain schema migration:
  - `db/migrations/002_ai_expansion.sql`
- Expanded `documents` for local-file and RAG metadata:
  - `local_path`, `extracted_text`, `text_chunks`, `chunk_embeddings`, `content_language`
- Added chat/exam/lesson/education-plan tables in clean backend DB.

New AI routes under `/v1`:
- `POST /ai/rag/retrieve`
- `GET/POST/PATCH/DELETE /ai/chat/assistants`
- `GET/POST /ai/chat/assistants/:assistantId/conversations`
- `GET/PATCH/DELETE /ai/chat/conversations/:id`
- `POST /ai/chat/conversations/:id/messages`
- Legacy: `POST /ai/chat/conversations` (assistant + first thread)
- `POST /ai/lessons/generate`
- `POST /ai/exams/generate`
- `POST /ai/education-plans/generate`
- `POST /ai/translate`
- `POST /ai/tts` (phase-1 placeholder response contract)
- `POST /ai/stt` (phase-1 placeholder response contract)
- `POST /ai/image/generate` (phase-1 prompt rewrite contract)

## Verification Completed

The following commands were run successfully:
- `npm run build -w @eduator/clean-backend`
- `npm run lint:forbidden-imports -w @eduator/clean-backend`
- `npm run test -w @eduator/clean-backend`

## Notes About Scope

- This backend is intentionally minimal and backend-first.
- UI integration is intentionally not part of this phase.
- Old platform concepts (organization/class/calendar/course coupling) are not introduced in this clean service architecture.

## 8) pgvector RAG upgrade (0.3.0)

- Migration **`015_pgvector_document_chunks.sql`**: `document_chunks` table with `vector(768)` + HNSW index.
- **`DocumentRagService`** refactored: pgvector SQL search, batch `retrieveMany()`, lazy backfill from legacy JSONB.
- **`src/utils/vector.ts`**: 768-dim truncate + L2 normalize for Gemini embeddings.
- **`teacher-chatbot.service.ts`**: batch document retrieval for tutor context.
- Requires **pgvector** PostgreSQL extension on the database host.

## Next Suggested Steps

1. Add OpenAPI schema generation for these endpoints.
2. Add role-based authorization rules on users/documents/ai endpoints.
3. Add pagination and filtering contracts for documents and AI requests.
4. Add Docker Compose for local PostgreSQL + service boot.
5. Add CI workflow for build/test + forbidden-import checks.
