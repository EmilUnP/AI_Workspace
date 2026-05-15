# Technical Summary (0.2.6)

## Architecture

- `apps/web-app` (Next.js) provides auth, school-admin, and platform-owner UI.
- `apps/backend` (Fastify + PostgreSQL) provides auth, users, documents, and AI endpoints.
- Web app calls backend with JWT access token.
- Per-user Gemini key is stored encrypted in DB and resolved per request in backend services.

## Data and Runtime Topology

- **Database**: PostgreSQL for users, auth tokens, documents, chats, lessons, exams, education plans, and user AI keys.
- **File storage**: backend local storage (`AI_STORAGE_DIR`) for uploaded docs and generated lesson media.
- **Auth model**: backend-issued JWT access token + refresh token.
- **Frontend-backend bridge**: Next.js server actions and API routes proxy to backend endpoints with JWT and **`X-Eduator-Client: web-app`** on first-party calls (`webAppBackendAuthHeaders` in `apps/web-app/src/lib/web-app-backend-headers.ts`).

## API access logging (0.2.6+)

- Table **`api_access_log`** stores `(user_id, api_key_id, method, path, status_code, created_at)` for authenticated responses used by **API Integration → Usage**. `api_key_id` is set when the caller uses an HTTP API key (`Authorization: Bearer ed_…`).
- The Fastify **`api-access-log`** plugin skips:
  - unauthenticated requests (no `authUser`)
  - **`GET /v1/users/me/api-keys/usage`** (avoids feedback loop)
  - requests with header **`X-Eduator-Client: web-app`** (official app traffic)
- Run **`npm run db:migrate`** in `apps/backend` so migrations `006_api_access_log.sql` and `007_api_access_log_api_key_id.sql` are applied.
- **`GET /v1/users/me/api-keys/usage`** supports `?range=today|30d|all` and returns **`byKey`** aggregates.

## AI Key Resolution Model

1. User saves Gemini key from API Integration.
2. Backend encrypts key before persisting (`user_ai_provider_keys`).
3. AI service resolves user key at request time.
4. If missing, backend throws structured error:
   - `code: MISSING_GEMINI_API_KEY`
   - human-readable hint for UI.

## Main User Flows

### School Admin

- Upload documents and monitor processing state.
- Generate lessons/exams/education plans from documents.
- Use AI Tutor conversations with optional document context.
- Manage personal Gemini key and **HTTP API keys** in API Integration; Usage reflects external-style `/v1` traffic (see Technical Summary — API access logging).

### Platform Owner

- Manage users and roles via platform-owner user pages.

## Documents Flow

1. Upload from web UI (`DocumentUploadZone`).
2. Web server action posts to backend `POST /v1/documents`.
3. Backend stores file to local storage + DB record.
4. Background RAG processing queue starts:
   - extract text
   - clean/sanitize text
   - chunk text
   - generate embeddings
   - detect language
   - store stats (`total_tokens`, `chunk_count`, `avg_chunk_size`, quality fields)
5. UI polls while documents are processing and refreshes list.

## File Access

- Backend endpoint: `GET /v1/documents/:id/file` (owner scoped).
- Web proxy endpoint: `GET /api/school-admin/documents/:id/file` (token-authenticated to backend).
- Download behavior uses `?download=1`.

## RAG Service Notes

- Core methods available in backend service:
  - `processDocumentOnUpload`
  - `getParsedDocumentText`
  - `getRelevantChunks`
  - `getRelevantContentFromDocuments`
  - `getDocumentsContent`
- Parsing currently supports:
  - PDF (`@cedrugs/pdf-parse`)
  - DOCX (`mammoth`)
  - DOC (`word-extractor`)
  - text fallback for plain text/markdown

## Error Handling Contract

- Global backend handler returns:
  - `error` (message)
  - optional `code`
  - optional `hint`
- Validation issues include `issues` array from Zod.
- Goal: avoid generic 500 responses for known operational misconfiguration.

## Data Safety Improvements

- NUL and malformed Unicode sanitization before DB writes.
- Safer JSON serialization for chunk/embedding payloads.
- File path resolution handles absolute + relative + legacy `storage/...` paths.
- Sensitive Gemini API keys are encrypted before persistence and never returned in full.

## Current Constraints

- Some legacy docs/history may still mention removed token surfaces.
- AI quality depends on source document quality (OCR noise can degrade results).
- Local storage model requires disk-level backup and cleanup discipline in production-like environments.
