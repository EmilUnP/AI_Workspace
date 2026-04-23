# App Stability Improvements

This document outlines **planned and in-progress** improvements in three areas to make the app more stable and debuggable. Not all items below are implemented yet.

---

## 1. Graceful Error Handling

**Problem:** When uploads or server operations fail (e.g. Vercel/server timeout, storage errors), the app can crash or show a blank/error screen instead of a clear message.

**Solution:**
- **Server actions** (e.g. `quickUploadDocument`): Wrap all logic in try/catch; map known errors (storage, network, auth) to **user-friendly messages** (e.g. "The file couldn't be uploaded due to a server problem. Please try again."). Never let raw exceptions bubble to the client.
- **Upload UI** (`DocumentUploadZone`): If the server action throws (e.g. serialization or timeout), catch it and set error state instead of crashing.
- **App-level** (`error.tsx`, `global-error.tsx`): Next.js error boundaries so any uncaught error shows a clean "Something went wrong" page with retry, instead of a crash.

**Files touched:**  
`apps/erp-app/src/app/teacher/documents/actions.ts`, `apps/erp-app/...`, `packages/ui/.../document-upload-zone.tsx`, `apps/*/src/app/error.tsx`, `apps/*/src/app/global-error.tsx`.

---

## 2. Document Quality Investigation & UI

**Problem:** After upload, documents are processed in the background. In reality some PDFs are 300+ pages with mostly images, or heavy Unicode, and extraction/chunking can be poor. Users don’t know why a document is "failed" or why generated content is weak.

**Solution:**
- **After upload:** Keep running existing RAG pipeline; in addition, persist a **quality assessment**:
  - `quality_status`: `good` | `low_quality` | `failed`
  - `quality_message` / `processing_error_message`: short, user-facing reason (e.g. "Too many images; little text extracted", "Text too short", "Processing failed: …").
- **Teacher documents list:** Add a **"Document info"** (or "Quality") button per row. Clicking opens a **modal** that shows:
  - Quality: Good / Low quality / Failed
  - Message (if any)
  - RAG stats (tokens, chunks) when available
  - Short note on how this may affect exams/lessons (e.g. "Low quality may affect AI-generated content").

**Backend:**  
- DB: add `processing_error_message`, `quality_status`, `quality_message` on `documents`.  
- `document-rag`: when setting `processing_status = 'failed'`, set `processing_error_message`; when `validateTextQuality` says invalid, set `quality_status = 'low_quality'` and `quality_message`; on success set `quality_status = 'good'`.

**Files touched:**  
Migration SQL, `packages/ai/src/services/document-rag.ts`, `packages/ui/.../documents-list.tsx` (modal + button), teacher documents page/selects.

---

## 3. Centralized Logging (Platform Owner)

**Problem:** Logs today are in Vercel, Supabase, and console. As platform owner you need one place to investigate issues across backend, ERP, and ERP.

**Options (research):**
- **Database table:** Store structured log entries (level, message, context, timestamp, app, user_id, request_id) in Postgres. Pros: queryable, one place. Cons: volume and retention need limits; can be expensive at scale.
- **File-based:** Write logs to files (e.g. per service). Pros: simple. Cons: hard to query; not ideal for serverless (Vercel).
- **Cloud / external:** Use Datadog, Logtail (Better Stack), Sentry, or Google Cloud Logging. Pros: querying, alerts, retention. Cons: cost, external dependency.
- **Shared package:** Create `@eduator/logger` in the monorepo used by all apps and api-server. Logger can: log to console in dev; in production optionally send to HTTP endpoint or write to DB (e.g. `app_logs` table) or to a cloud provider.

**Recommendation:**  
- **Short term:** Add a shared `@eduator/logger` that formats logs consistently and supports a "log to DB" transport (e.g. batch insert to `app_logs`). Platform owner can query logs in Supabase or a simple admin "Logs" page.
- **Long term:** If volume grows or you need alerts, add a cloud log sink (e.g. Logtail/Datadog) and keep the shared logger as the single interface.

**Next steps:**  
- Design `app_logs` schema (level, message, meta jsonb, service, timestamp, etc.).  
- Implement `@eduator/logger` and optional DB transport.  
- Add a minimal "Logs" page (platform-owner or backend) to filter and view recent logs.

See [docs/technical/LOGGING.md](./technical/LOGGING.md) for detailed design.

---

**Last updated:** February 2026.
