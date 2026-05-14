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

## 6) Per-user Gemini key in DB (encrypted)

- Gemini keys are stored per user in database, encrypted before persistence.
- Reason: avoid shared global key coupling and support user-scoped billing/control.

## 7) Structured AI configuration errors

- Missing-key situations return structured API payload (`error`, `code`, `hint`) instead of generic internal error.
- Reason: improve operator UX and reduce support/debug time.

## 8) Separate integration usage from first-party UI traffic

- Authenticated `/v1` responses can be written to **`api_access_log`** for the Usage dashboard.
- The official Next.js app sends **`X-Eduator-Client: web-app`** on server-side backend fetches; the access-log hook skips those rows.
- Reason: avoid treating every page refresh as “API integration” traffic while still allowing external clients (no header) to populate Usage.

## 9) Remove token product surfaces from active web app

- Token pages/settings/usage UI removed from school-admin and platform-owner active routes.
- Reason: simplify product scope and reduce maintenance overhead during migration stabilization.
