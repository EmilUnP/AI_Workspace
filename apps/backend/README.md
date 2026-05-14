# Backend API (Clean Version)

Backend-only service with local PostgreSQL and JWT authentication.

## Scope
- No Supabase dependency
- No organization/class/calendar legacy coupling
- Single clean API under `/v1/*`
- Core domains: auth, users, documents, AI

## What This Backend Owns

- User auth and role handling
- Document metadata and file access
- RAG processing pipeline (extract/chunk/embed/retrieve)
- AI generation endpoints (chat, lessons, exams, education plans, translation/media helpers)
- Per-user Gemini API key management (encrypted at rest)
- **User HTTP API keys** (`/v1/users/me/api-keys`) and **usage** (`/v1/users/me/api-keys/usage`) backed by **`api_access_log`** after migration `006_api_access_log.sql`
- **Access logging:** first-party Next.js server calls send `X-Eduator-Client: web-app` and are excluded from `api_access_log` (see `apps/web-app/src/lib/web-app-backend-headers.ts`)

## Local Setup
1. Create `apps/backend/.env.local` from `apps/backend/.env.example`.
2. Ensure PostgreSQL is running and `DATABASE_URL` is valid.
3. Install dependencies from repo root:
   - `npm install`

## Run Commands
From `apps/backend`:
- Dev: `npm run dev`
- Build: `npm run build`
- Start (prod build): `npm run start`
- Migrate: `npm run db:migrate`
- Seed: `npm run db:seed`
- Test: `npm run test`
- Legacy boundary check: `npm run lint:forbidden-imports`

## Base URLs
- Health: `GET /health`
- API base: `/v1`

Default local host/port come from env (`HOST`, `PORT`), typically:
- `http://localhost:4000` (or configured port)

## Authentication
JWT Bearer token required for protected endpoints.

- Add header:
  - `Authorization: Bearer <access_token>`

### Auth Endpoints
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/auth/me` (protected)

### User AI Key Endpoints (Protected)

- `GET /v1/users/me/ai-keys/gemini`
- `PUT /v1/users/me/ai-keys/gemini`
- `DELETE /v1/users/me/ai-keys/gemini`

## Endpoint Reference

### Health
- `GET /health`
  - Response: `{ "ok": true }`

### Auth
- `POST /v1/auth/register`
  - Body: `{ "email": "...", "password": "...", "role": "admin|operator|user" }`
- `POST /v1/auth/login`
  - Body: `{ "email": "...", "password": "..." }`
- `POST /v1/auth/refresh`
  - Body: `{ "refreshToken": "..." }`
- `GET /v1/auth/me` (protected)

### Users
- `GET /v1/users` (protected)
  - Response: `{ "items": [...] }`

### Documents
- `POST /v1/documents` (protected)
  - Creates a document record for the authenticated user.
- `GET /v1/documents` (protected)
  - Lists documents for authenticated user.
- `GET /v1/documents/:id` (protected)
  - Gets one document by id (owner scoped).
- `GET /v1/documents/:id/file` (protected)
  - Streams original file by id (owner scoped).

### AI - Generic Request Tracking
- `POST /v1/ai/requests` (protected)
- `GET /v1/ai/requests/:id` (protected)

### AI - RAG
- `POST /v1/ai/rag/retrieve` (protected)

### AI - Teacher Chat
- `GET /v1/ai/chat/conversations` (protected)
- `POST /v1/ai/chat/conversations` (protected)
- `POST /v1/ai/chat/conversations/:id/messages` (protected)

### AI - Generation
- `POST /v1/ai/lessons/generate` (protected)
- `POST /v1/ai/exams/generate` (protected)
- `POST /v1/ai/exams/translate` (protected)
- `POST /v1/ai/education-plans/generate` (protected)
- `POST /v1/ai/translate` (protected)
- `POST /v1/ai/tts` (protected)
- `POST /v1/ai/stt` (protected)
- `POST /v1/ai/image/generate` (protected)

### User HTTP API keys & usage (0.2.5+)

- `GET /v1/users/me/api-keys` — list keys (prefix only)
- `POST /v1/users/me/api-keys` — create (returns raw key once)
- `DELETE /v1/users/me/api-keys/:id` — revoke
- `GET /v1/users/me/api-keys/usage` — usage stats (see `API_DOCUMENTATION.md` §2.2)

## Quick Validation Flow
1. `GET /health`
2. `POST /v1/auth/register`
3. `POST /v1/auth/login`
4. Use returned access token with `Authorization: Bearer ...`
5. `GET /v1/auth/me`
6. `GET /v1/documents`

## Request Collection
Use `apps/backend/requests.http` for quick local calls and adapt port if needed.

## Full API Docs
- Detailed human-readable docs: `apps/backend/API_DOCUMENTATION.md`
- OpenAPI spec (Swagger/Postman import): `apps/backend/openapi.yaml`

## Troubleshooting

- **401 Unauthorized**
  - Ensure `Authorization: Bearer <access_token>` is sent.
  - Verify token is from `/v1/auth/login` in this same backend environment.
- **Gemini key missing**
  - AI endpoints may return `MISSING_GEMINI_API_KEY`.
  - Add key from `/school-admin/api-integration` in the web app.
- **Document processing issues**
  - Confirm `AI_STORAGE_DIR` exists and backend process can read/write it.
  - Verify `file_type` is one of supported parser types.
