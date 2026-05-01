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
