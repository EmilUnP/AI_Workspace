# Eduator AI Workspace

Current baseline version: **0.2.0**.

## Current Scope

- `apps/web-app` (Next.js 15) for auth, school-admin, and platform-owner flows
- `apps/backend` (Fastify + PostgreSQL) for auth, users, documents, and AI endpoints
- Per-user Gemini API key management in API Integration
- Token-based product surfaces removed from active web app routes

## Product Modules

- **Auth**: login flow with backend-issued JWT access/refresh tokens.
- **School Admin**:
  - Documents (upload/list/view/download/delete)
  - Lessons (AI generation + detail pages + media support)
  - Exams (AI generation and management)
  - Education Plans (AI generation + normalized detail rendering)
  - AI Tutor chat
  - API Integration (user Gemini key management)
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
- web app: `http://localhost:3001`

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
  - `NEXT_PUBLIC_*` values for frontend URLs/integration

## How AI Keying Works

1. Operator/admin saves Gemini key in `/school-admin/api-integration`.
2. Backend stores it encrypted in `user_ai_provider_keys`.
3. AI routes resolve key per authenticated user.
4. If missing, API returns:
   - `code: MISSING_GEMINI_API_KEY`
   - user-facing hint for next action.

## Core Technical Docs

- `docs/TECHNICAL_SUMMARY.md`
- `docs/API_SUMMARY.md`
- `docs/DECISIONS.md`
- `CHANGELOG.md`
- `apps/backend/README.md`
- `apps/backend/API_DOCUMENTATION.md`
- `apps/backend/openapi.yaml`
