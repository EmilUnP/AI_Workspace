# Project Status (0.1.0)

## Completed

- Supabase-first legacy paths removed from active operator/platform-owner documents flow.
- Local PostgreSQL + backend JWT flow is active for current app usage.
- School-admin/operator documents page refit with:
  - richer explorer UI (list/grid, filters, grouping, stats, quality modal)
  - upload state UX (idle/uploading/success/error)
  - view + download controls
- Document file serving fixed:
  - backend: `GET /v1/documents/:id/file`
  - web-app proxy: `GET /api/school-admin/documents/:id/file`
- Physical file cleanup on delete added (DB delete + filesystem delete).
- RAG pipeline hardened:
  - path resolution fixes
  - parser selection fixes by file type
  - safer text/JSON sanitization for DB writes
  - embedding model compatibility fallback
  - language detection improvements

## In Progress / Needs Verification

- Language detection quality for Latin-script non-English texts (especially Azerbaijani/Turkish) should be validated with multiple real files.
- Chunk quality and token counts should be benchmarked against known good documents from older version.

## Known Risks

- Very noisy PDFs can still create low-quality extracted text.
- Existing already-processed rows may need re-upload/reprocess to benefit from latest parser/cleaning fixes.

## Current Focus

1. Stabilize RAG quality metrics (tokens/chunks/language correctness).
2. Add safe reprocess action for existing documents (without re-upload).
3. Expand automated checks for document parsing and retrieval quality.
