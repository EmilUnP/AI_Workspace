# Eduator AI Workspace

Current baseline version: **0.2.9**.

## Current Scope

- `apps/web-app` (Next.js 15) for auth, school-admin, and platform-owner flows
- `apps/backend` (Fastify + PostgreSQL) for auth, users, documents, and AI endpoints
- Per-user Gemini API key management in API Integration
- **HTTP API keys** (create/list/revoke) and **Usage** analytics backed by `api_access_log` (external `/v1` calls); first-party server traffic sends `X-Eduator-Client: web-app` and is excluded from Usage rows
- Token-based product surfaces removed from active web app routes

## Product Modules

- **Auth**: login flow with backend-issued JWT access/refresh tokens.
- **School Admin**:
  - Documents (upload/list/view/download/delete); default landing after login to school-admin is the document library
  - Lessons (AI generation + detail pages + media support)
  - Exams (AI generation and management)
  - Education Plans (AI generation + normalized detail rendering)
  - AI Tutor chat
  - API Integration (HTTP API keys, Usage tab, Gemini key, in-app docs aligned with `/v1`)
- **Platform Owner**:
  - Dashboard
  - Users management

## Quick Start

```bash
npm install
npm run dev:all
```

`dev:all` starts:
- backend: `http://localhost:4000`
- web app: `http://localhost:3000`

## Main Scripts

- `npm run dev:all` - Start API and web app together (Windows launcher)
- `npm run dev:clean` - Start backend only
- `npm run build` - Build backend package
- `npm run lint` - Lint workspace
- `npm run type-check` - TypeScript check

## Environment Setup

Use app-level env files:

- `apps/backend/.env.local`
  - required: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  - optional fallback: `GOOGLE_GEMINI_API_KEY` (user key in DB is preferred)
- `apps/web-app/.env.local`
  - `NEXT_PUBLIC_API_URL` — backend API base (e.g. `http://localhost:4000` or `https://api.eduator.ai`)
  - `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_ERP_URL` — web app origin for redirects and file URLs

## How AI Keying Works

1. Operator/admin saves Gemini key in `/school-admin/api-integration`.
2. Backend stores it encrypted in `user_ai_provider_keys`.
3. AI routes resolve key per authenticated user.
4. If missing, API returns:
   - `code: MISSING_GEMINI_API_KEY`
   - user-facing hint for next action.

## API usage analytics (0.2.6+)

- After `apps/backend` migrations **`006_api_access_log.sql`** and **`007_api_access_log_api_key_id.sql`**, authenticated `/v1` responses are stored for the **Usage** tab (`GET /v1/users/me/api-keys/usage?range=today|30d|all`), with **per HTTP API key** breakdown when callers use `Authorization: Bearer ed_…`.
- The official web app marks server-to-backend calls with **`X-Eduator-Client: web-app`** so routine UI traffic is not logged as “integration usage.”
- Postman, scripts, and other clients should **not** send that header if you want calls to appear under Usage.

## Core Technical Docs

- `docs/TECHNICAL_SUMMARY.md`
- `docs/API_SUMMARY.md`
- `docs/DECISIONS.md`
- `CHANGELOG.md`
- `apps/backend/README.md`
- `apps/backend/API_DOCUMENTATION.md`
- `apps/backend/openapi.yaml`
