# Technical Summary (0.1.0)

## Architecture

- `apps/web-app` (Next.js) provides operator/platform-owner UI.
- `apps/backend` (Fastify + PostgreSQL) provides auth, users, documents, and AI endpoints.
- Web app calls backend with JWT access token.

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

## Data Safety Improvements

- NUL and malformed Unicode sanitization before DB writes.
- Safer JSON serialization for chunk/embedding payloads.
- File path resolution handles absolute + relative + legacy `storage/...` paths.
