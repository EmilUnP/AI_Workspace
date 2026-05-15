# Changelog

## 0.2.7 - 2026-05-15

### Changed

- **School-admin API Integration docs** — **Keys & Docs** is explicitly **third-party only**: all examples use `Authorization: Bearer YOUR_API_KEY` (`ed_…`); login JWT and `X-Eduator-Client: web-app` are called out as not for integrations.
- **Auth documentation** — `API_SUMMARY.md`, `API_DOCUMENTATION.md`, and `TECHNICAL_SUMMARY.md` distinguish the official web app (JWT + internal header) from external HTTP API keys.
- **Exams list stats** — mobile summary shows **total exams** and **total questions** (removed unused published/draft counts).

### Removed

- Unused **`subject`** field from exams/lessons REST, AI exam generation, web exam create payload, OpenAPI, and in-app integration docs.
- Unused **`is_published` / `isPublished`** from exams and lessons APIs, exam stats, web UI components, and API docs.
- **`toggleLessonPublished`** server action (unused).

## 0.2.6 - 2026-05-15

### Added

- **HTTP API key authentication** — Protected `/v1/*` routes accept `Authorization: Bearer ed_…` (raw key from **POST** `/v1/users/me/api-keys`), in addition to JWT.
- **`api_access_log.api_key_id`** (migration `007_api_access_log_api_key_id.sql`) — attributes each logged request to the HTTP API key when used.
- **Per-key usage analytics** — `GET /v1/users/me/api-keys/usage` returns **`byKey`** breakdowns; recent rows include **`apiKeyId`**. Usage UI shows a **Key** column, key filter on recent requests, and an **Other (login token)** bucket for JWT-only traffic.
- **Usage date ranges** — `GET /v1/users/me/api-keys/usage?range=today|30d|all`; school-admin **Usage** tab buttons: **Today**, **Last 30 days**, **All**.
- **In-app API documentation** — Expanded curls for documents, lessons (incl. delete), exams REST, education plans (GET/POST/DELETE), AI chat tutor, and saved exams; aligned with backend routes actually shipped.

### Changed

- **`user_api_keys.last_used_at`** updates when a request is authenticated with that HTTP API key.
- School-admin API docs no longer document **PATCH** for documents, saved exams, or education plans (not exposed in the integration UI for those resources).

### Notes

- Run `npm run db:migrate` in `apps/backend` so `007_api_access_log_api_key_id.sql` is applied.
- External integrations should use **`ed_` API keys** (not login JWT) for per-project usage in the Usage tab.

## 0.2.5 - 2026-05-14

### Added

- **`api_access_log` table** (migration `006_api_access_log.sql`) — one row per authenticated HTTP response used for **API Integration → Usage** analytics.
- **`api-access-log` Fastify plugin** — records method, route pattern, and status code; skips `GET /v1/users/me/api-keys/usage` to avoid self-polling noise.

### Changed

- **Usage analytics semantics** — `GET /v1/users/me/api-keys/usage` aggregates from `api_access_log` (with fallback to `ai_requests` if the new table is not migrated). Success/error counts use HTTP status (`<400` / `>=400`). Legacy `ai_requests` mapping now treats `completed` / `done` as success.
- **First-party vs external traffic** — Official Next.js server calls send `X-Eduator-Client: web-app` via `webAppBackendAuthHeaders()` (`apps/web-app/src/lib/web-app-backend-headers.ts`); the access-log plugin **does not insert** rows for those requests so normal UI refreshes do not flood the DB. External tools (curl, Postman, integrations) omit that header so their calls appear in Usage.
- **School admin** — `/school-admin` redirects to **Document Library** (`/school-admin/documents`); **Dashboard** removed from the school-admin nav where applicable; **API Integration** remains documented in-app.
- **Lessons API** — `GET /v1/lessons/:id` normalizes relative `images[].url` and `audio_url` to **absolute** URLs when possible for third-party consumers.
- **Docs & OpenAPI** — API summaries, technical overview, project report, backend README, and `openapi.yaml` metadata aligned with **0.2.5** and the behaviors above.

### Notes

- Run `npm run db:migrate` in `apps/backend` after deploy so `api_access_log` exists.
- `X-Eduator-Client` is an **analytics opt-out for the official app only**, not a security boundary.

## 0.2.0 - 2026-05-08

### Changed

- Added per-user Gemini API key management:
  - new backend key storage with encryption
  - new authenticated routes for save/status/delete of Gemini key
  - API Integration tab in school-admin for Gemini key management
- Wired AI services to use user-specific Gemini key resolution.
- Added explicit missing-key errors with API-friendly payload:
  - `code: MISSING_GEMINI_API_KEY`
  - actionable hint in response
- Refined school-admin and education plan flows:
  - list/detail UX cleanup
  - plan parsing/display improvements
  - chat and tokens pages stabilization updates
- Removed token-oriented product surfaces from active web app flows:
  - removed school-admin tokens page
  - removed platform-owner token settings and real token usage routes/UI
  - removed related token-side nav entries and token-shim dependencies
- Removed legacy `/auth/signup` redirect page as part of route cleanup.
- Restored and documented local launcher script flow via `npm run dev:all`.
- Bumped project versioning and docs/openapi baseline to `0.2.0`.

## 0.1.0 - 2026-05-01

### Changed

- Migrated project/version baseline to `0.1.0` across root manifests and OpenAPI metadata.
- Upgraded school-admin documents UX (richer cards/list metadata, language and tags shown in both list and grid views).
- Added authenticated web-app document file proxy route for view/download flows.
- Added backend secure file streaming endpoint: `GET /v1/documents/:id/file`.
- Fixed view/download behavior split by using `?download=1` for download action.
- Fixed document delete behavior to remove both DB record and physical stored file.
- Hardened document upload/list mapping to use canonical file URLs and normalized processing states.
- Expanded backend RAG service with reusable core methods:
  - `getParsedDocumentText`
  - `getRelevantChunks`
  - `getRelevantContentFromDocuments`
  - `getDocumentsContent`
- Improved RAG pipeline resilience:
  - robust storage path resolution
  - UTF-8/NUL sanitization for DB writes
  - safer JSONB serialization for chunks/embeddings
  - canonical file type normalization to avoid binary-as-text parsing
  - improved extraction cleanup to reduce noisy chunk inflation
  - embedding model compatibility update (`gemini-embedding-001` fallback)
  - improved language detection heuristics (including Azerbaijani/Turkish signals)

### Notes

- This release finalizes the current local PostgreSQL + clean backend documents/RAG baseline.
- Legacy Supabase-specific behavior is no longer required for current operator/platform-owner flows.

## 0.0.9 - 2026-04-30

### Changed

- Completed cleanup pass for legacy auth and user-management surfaces in `apps/web-app`.
- Removed pending-approval UI flow usage and legacy approval-focused platform-owner dashboard actions.
- Removed avatar-related fields/rendering across platform-owner and school-admin user UIs.
- Updated login redirect behavior: `admin` users now land on `/platform-owner` after login.
- Simplified platform-owner users page by removing filter UI and adding a simple "Add Operator" flow (email + password, fixed role `operator`).
- Removed mobile sidebar bottom user summary section for cleaner mobile navigation.

### Backend Integration Notes

- Web operator creation now uses `POST /v1/auth/register` with payload role fixed to `operator`.
- No new backend endpoints were required for this step; existing auth routes are reused.

### Notes

- This continues the Supabase-to-local-PostgreSQL cleanup and role-flow simplification.
- Remaining legacy concepts should be removed incrementally in subsequent cleanup passes.

## 0.0.8 - 2026-04-23

### Changed

- Continued hard cleanup of legacy ERP surfaces.
- Removed remaining school-admin class-management UI/routes.
- Removed teacher classes API route and related navigation links.
- Restricted school-admin user management to teacher-only scope.
- Updated docs baseline to match current product state.

### Notes

- This release is the current clean baseline after deep cleanup passes.
- Legacy class, calendar, and student-facing features are intentionally removed from active app surfaces.

## 0.0.5-reset - 2026-04-23

### Changed

- Documentation reset to a lightweight baseline.
- Product scope documented as ERP-first.
- SaaS references removed from active docs.
- Student portal removal documented in current-state docs.

### Notes

- This release acts as a new documentation starting point.
- Older narrative/history is intentionally dropped from docs.
