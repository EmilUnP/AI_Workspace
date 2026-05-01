# Roadmap (Post 0.1.0)

## Priority 1 - RAG Reliability

- Add "reprocess document" endpoint/action for existing rows.
- Add parser-quality diagnostics (why low quality, parser used, fallback reason).
- Improve chunking strategy with sentence-aware boundaries for noisy docs.

## Priority 2 - Product UX

- Add clear "processing/failed/retry" controls per document row.
- Add quick filters for language and processing status.
- Add compact metrics panel for RAG quality trends.

## Priority 3 - Testing and Ops

- Add backend tests for:
  - file path resolution
  - delete behavior (DB + disk)
  - parser branch selection by `file_type`
  - language detection behavior
- Add lightweight script for orphan file cleanup in storage.

## Priority 4 - Documentation

- Keep `docs/STATUS.md` updated at end of each milestone.
- Add troubleshooting playbook for document parsing failures.
