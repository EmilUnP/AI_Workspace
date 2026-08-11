# Technical Decisions

## 1) Keep backend-owned local file storage

- Files are stored on backend disk under configured storage directory.
- Reason: straightforward local-first setup and simpler migration off external storage.

## 2) Use web proxy for file access

- Web app exposes `/api/school-admin/documents/:id/file` and forwards with auth token.
- Reason: avoid exposing raw backend URL directly in UI and keep access policy centralized.

## 3) Delete must remove DB + file

- Document delete now removes physical file and then DB record.
- Reason: prevent storage bloat and orphan files.

## 4) Canonical file type normalization

- Store canonical `file_type` values (`pdf`, `docx`, `doc`, `markdown`, `text`).
- Reason: enforce correct parser selection and avoid binary-as-text extraction.

## 5) Defensive RAG persistence

- Sanitize extracted text for DB safety.
- Use safe JSON serialization for chunks/embeddings.
- Reason: prevent processing failures from malformed text/JSON payloads.

## 6) Platform OpenRouter credential (encrypted)

- Platform OpenRouter key is stored encrypted in `ai_provider_credentials`, with optional `OPENROUTER_API_KEY` env fallback.
- School admins no longer store model provider keys.
- Reason: centralize billing/control at platform level and simplify operator setup after the OpenRouter migration (0.4.0).

## 7) Structured AI configuration errors

- Missing-key situations return structured API payload (`error`, `code`, `hint`) instead of generic internal error — e.g. `MISSING_OPENROUTER_API_KEY`.
- Reason: improve operator UX and reduce support/debug time.

## 8) Separate integration usage from first-party UI traffic

- Authenticated `/v1` responses can be written to **`api_access_log`** for the Usage dashboard.
- The official Next.js app sends **`X-Eduator-Client: web-app`** on server-side backend fetches; the access-log hook skips those rows.
- Reason: avoid treating every page refresh as “API integration” traffic while still allowing external clients (no header) to populate Usage.

## 9) Remove token product surfaces from active web app

- Token pages/settings/usage UI removed from school-admin and platform-owner active routes.
- Reason: simplify product scope and reduce maintenance overhead during migration stabilization.

## 10) pgvector for RAG instead of JSONB + in-memory search (0.3.0)

- Store chunk embeddings in **`document_chunks`** with PostgreSQL **pgvector** (`vector(768)`) and an **HNSW** index.
- Run similarity search in SQL (`<=>` cosine distance) rather than loading all embeddings into Node.js.
- Embeddings via **OpenRouter** (default model id `google/gemini-embedding-001`, **768-dim** MRL truncation + L2-normalize).
- Reason: scale for multi-document RAG (lessons, exams, tutor chat) under concurrent usage without CPU/memory bottlenecks.
- Full guide: [RAG_AND_VECTOR_SEARCH.md](./RAG_AND_VECTOR_SEARCH.md).
