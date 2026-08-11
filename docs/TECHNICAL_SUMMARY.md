# Technical Summary (0.4.0)

## Architecture

- `apps/web-app` (Next.js) provides auth, school-admin, and platform-owner UI.
- `apps/backend` (Fastify + PostgreSQL) provides auth, users, documents, and AI endpoints.
- Web app calls backend with JWT access token.
- Platform OpenRouter key and workload model policies are managed by platform admins (`/platform-owner/ai-providers`).

## Data and Runtime Topology

- **Database**: PostgreSQL for users, auth tokens, documents, chats, lessons, exams, education plans, API keys, and platform AI provider settings.
- **Vector search**: **pgvector** extension with **`document_chunks`** table (`vector(768)` + HNSW index) for RAG similarity search (0.3.0+).
- **File storage**: backend local storage (`AI_STORAGE_DIR`) or PostgreSQL `file_data` depending on `FILE_STORAGE`.
- **Auth model**: backend-issued JWT access token + refresh token for the web app; **HTTP API keys** (`ed_…`) for third-party `/v1` callers.
- **Frontend-backend bridge**: Next.js server actions and API routes proxy to backend endpoints with JWT and **`X-Eduator-Client: web-app`** on first-party calls (`webAppBackendAuthHeaders` in `apps/web-app/src/lib/web-app-backend-headers.ts`).
- **School admin → API Integration → Keys & Docs**: in-app curl reference is **third-party only** (API key in `Authorization: Bearer`, not login JWT). The web app itself is unchanged.

## API access logging (0.2.6+)

- Table **`api_access_log`** stores `(user_id, api_key_id, method, path, status_code, created_at)` for authenticated responses used by **API Integration → Usage**. `api_key_id` is set when the caller uses an HTTP API key (`Authorization: Bearer ed_…`).
- The Fastify **`api-access-log`** plugin skips:
  - unauthenticated requests (no `authUser`)
  - **`GET /v1/users/me/api-keys/usage`** (avoids feedback loop)
  - requests with header **`X-Eduator-Client: web-app`** (official app traffic)
- Run **`npm run db:migrate`** in `apps/backend` so migrations `006_api_access_log.sql` and `007_api_access_log_api_key_id.sql` are applied.
- **`GET /v1/users/me/api-keys/usage`** supports `?range=today|30d|all` and returns **`byKey`** aggregates.

## AI Provider Model (0.4.0)

1. Platform admin saves an OpenRouter key under **AI Providers** (encrypted with `AI_CREDENTIALS_ENCRYPTION_KEY`).
2. Workload policies select ordered model fallback chains (lessons, exams, chat, embeddings, images, TTS).
3. Feature services call `AiGateway` / OpenRouter; missing key returns `MISSING_OPENROUTER_API_KEY`.
4. Optional env fallback: `OPENROUTER_API_KEY` when no DB credential is configured.

## Main User Flows

### School Admin

- Upload documents and monitor processing state.
- Generate lessons/exams/education plans from documents.
- **AI Tutor (0.2.9):** create **assistants** (`teacher_chat_assistants`) with optional core `documentIds`; start **conversations** (threads) per assistant; messages on `teacher_chat_conversations`. In-app UI: assistant sidebar → chat list → message pane. Optional **short answer** toggle maps to `shortAnswer` on send.
- Manage **HTTP API keys** in API Integration; Usage reflects external-style `/v1` traffic (see Technical Summary — API access logging).

### Platform Owner

- Manage users and roles via platform-owner user pages.
- Configure OpenRouter key, model catalog, and workload policies.

## Documents Flow

1. Upload from web UI (`DocumentUploadZone`).
2. Web server action posts to backend `POST /v1/documents`.
3. Backend stores file to local storage or DB + DB record.
4. Background RAG processing queue starts:
   - extract text
   - clean/sanitize text
   - chunk text
   - generate embeddings (OpenRouter; default `google/gemini-embedding-001`, 768-dim normalized)
   - persist vectors to **`document_chunks`** (pgvector)
   - detect language
   - store stats (`total_tokens`, `chunk_count`, `avg_chunk_size`, quality fields)
5. UI polls while documents are processing and refreshes list.

## File Access

- Backend endpoint: `GET /v1/documents/:id/file` (owner scoped).
- Web proxy endpoint: `GET /api/school-admin/documents/:id/file` (token-authenticated to backend).
- Download behavior uses `?download=1`.

## RAG / Vector Search (0.3.0+)

Full architecture guide (legacy JSONB vs pgvector, deployment, future options): **[RAG_AND_VECTOR_SEARCH.md](./RAG_AND_VECTOR_SEARCH.md)**.

### Stack (summary)

| Layer | Technology |
|--------|------------|
| Embeddings | OpenRouter `google/gemini-embedding-001` (768-dim, L2-normalized) |
| Vector store | PostgreSQL **pgvector** (`document_chunks.embedding vector(768)`) |
| Index | **HNSW** with `vector_cosine_ops` |
| Search | SQL `ORDER BY embedding <=> query_vector LIMIT k` |

### Schema

| Table / column | Role |
|----------------|------|
| `documents.text_chunks` | Cached chunk text (JSONB); stats on parent row |
| `documents.chunk_embeddings` | **Legacy** — no longer written; lazy-backfilled into `document_chunks` |
| `document_chunks` | One row per chunk: `content`, `embedding`, `chunk_index`; cascades on document delete |

### Service methods (`DocumentRagService`)

- `processDocumentOnUpload` — extract, chunk, embed, index in pgvector
- `getParsedDocumentText` — owner-scoped full text
- `getRelevantChunks` — single-document vector search
- `getRelevantContentFromDocuments` — **one SQL query** across multiple documents
- `retrieveMany` — batch retrieval grouped by document (AI Tutor)
- `getDocumentsContent` — concatenate full texts

### Migration & ops

- Migration: **`015_pgvector_document_chunks.sql`**
- Requires **pgvector** installed on PostgreSQL host
- Run: `npm run db:migrate` in `apps/backend`
- Legacy documents: JSONB embeddings migrated on first RAG access

### Parsing support

- PDF (`@cedrugs/pdf-parse`)
- DOCX (`mammoth`)
- DOC (`word-extractor`)
- text fallback for plain text/markdown

## AI Tutor data model (0.2.9)

| Table | Role |
|-------|------|
| `teacher_chat_assistants` | Tutor config (`title`, `document_ids`) — one per “bot” |
| `teacher_chat_conversations` | Chat thread (`assistant_id`, optional `external_user_id`, `title`) |
| `teacher_chat_messages` | Messages (`conversation_id`, `role`, `content`) |

- **In-app (JWT):** `external_user_id` is always `NULL` on conversations.
- **Third-party (API key):** optional `externalUserId` when creating/listing conversations; integrators store **`conversation.id`** per end-user and use it for `POST .../messages` (no `externalUserId` on every call).
- **Migrations:** `008_teacher_chat.sql` through `012_external_user_on_conversations.sql` (`npm run db:migrate` in `apps/backend`).

## Error Handling Contract

- Global backend handler returns:
  - `error` (message)
  - optional `code`
  - optional `hint`
- Validation issues include `issues` array from Zod.
- Goal: avoid generic 500 responses for known operational misconfiguration.

## Data Safety Improvements

- NUL and malformed Unicode sanitization before DB writes.
- Safer JSON serialization for chunk payloads.
- File path resolution handles absolute + relative + legacy `storage/...` paths.
- Platform OpenRouter credentials are encrypted before persistence and never returned in full.

## Current Constraints

- **pgvector required** for RAG after migration 015 — install extension on DB host before deploy.
- Some legacy docs/history may still mention removed token surfaces.
- AI quality depends on source document quality (OCR noise can degrade results).
- Local storage model requires disk-level backup and cleanup discipline in production-like environments.
