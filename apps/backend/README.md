# Clean Backend

Backend-only clean service with local PostgreSQL and JWT authentication.

## Scope
- No Supabase
- No organization/class/calendar/course domain coupling
- APIs: auth, users, documents, ai requests

## Setup
1. Copy `.env.example` to `.env`.
2. Ensure PostgreSQL is running and `DATABASE_URL` is valid.
3. Install dependencies from repo root:
   - `npm install`

## Run
- Dev: `npm run dev -w @eduator/clean-backend`
- Build: `npm run build -w @eduator/clean-backend`
- Start: `npm run start -w @eduator/clean-backend`

## Database
- Migrate: `npm run db:migrate -w @eduator/clean-backend`
- Seed: `npm run db:seed -w @eduator/clean-backend`

## Test
- `npm run test -w @eduator/clean-backend`

## Quick API checks
Use `requests.http` or curl:
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `POST /v1/documents`
- `GET /v1/documents`
- `POST /v1/ai/requests`
- `GET /v1/ai/requests/:id`
