# API Summary (0.2.5)

Base URL (local): `http://localhost:4000/v1`

Authentication: `Authorization: Bearer <accessToken>` required for protected routes.

**First-party web app (Next.js server):** all built-in server calls to the backend also send `X-Eduator-Client: web-app` so **API Integration → Usage** does not treat normal UI traffic as external API usage. External clients should omit that header if they want calls counted in Usage.

## API Groups

- **Auth**: register/login/refresh/me
- **Users**: list + password update
- **User HTTP API keys**: list/create/revoke + **usage** analytics (`/users/me/api-keys`, `/users/me/api-keys/usage`)
- **Documents**: upload/list/detail/file/update/delete
- **AI**:
  - RAG retrieval
  - chat conversations/messages
  - lessons/exams/education plans generation
  - translation/media helper endpoints
- **User AI Key**: Gemini key status/save/delete

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

## Users

- `GET /users`
- `PATCH /users/:id/password`

## Documents

- `POST /documents` - create document + trigger processing queue. **Body:** `title`, `fileName`, `fileType`, `fileSize`, optional `metadata`, and either **`contentBase64`** (standard for third-party uploads) or **`localPath`** (file already on backend disk / mount).
- `GET /documents` - list own documents (`{ "items": [...] }`; includes `status`, `content_language`, quality fields)
- `GET /documents/:id` - get single document JSON
- `GET /documents/:id/file` - stream original file bytes (PDF/Word/etc.; not JSON)
- `PATCH /documents/:id` - update title/metadata
- `DELETE /documents/:id` - delete DB record + physical file

## AI / RAG

- `POST /ai/rag/retrieve` - retrieve relevant chunks for query
- AI generation routes (lesson/exam/etc.) continue to use backend AI modules.

### AI Chat Endpoints

- `GET /ai/chat/conversations`
- `POST /ai/chat/conversations`
- `GET /ai/chat/conversations/:id`
- `PATCH /ai/chat/conversations/:id`
- `DELETE /ai/chat/conversations/:id`
- `POST /ai/chat/conversations/:id/messages`

### AI Generation Endpoints

- `POST /ai/lessons/generate`
- `POST /ai/exams/generate`
- `POST /ai/exams/translate`
- `POST /ai/education-plans/generate` — `documentId`, `name`, optional `language` or `outputLanguage` (e.g. `az`); backend instructs the model to write all plan strings in that language
- `GET /education-plans` — list saved plans (`items` include full `content`; optional query `search`). No separate `GET .../stats` or `GET .../:id`.
- `POST /education-plans` — create row (snake_case body, e.g. `period_months`, `document_ids`, `content`)
- `PATCH /education-plans/:id` — partial update (snake_case)
- `DELETE /education-plans/:id` — delete plan
- `POST /ai/translate`
- `POST /ai/tts`
- `POST /ai/stt`
- `POST /ai/image/generate`

## User AI Key

- `GET /users/me/ai-keys/gemini` - Gemini key status for authenticated user
- `PUT /users/me/ai-keys/gemini` - save/update authenticated user key
- `DELETE /users/me/ai-keys/gemini` - remove authenticated user key

## User HTTP API keys & usage (0.2.5+)

Requires migration `006_api_access_log.sql` on the backend database.

- `GET /users/me/api-keys` — list active keys (prefix only, never full secret)
- `POST /users/me/api-keys` — create key; response includes **raw key once** in `key`
- `DELETE /users/me/api-keys/:id` — revoke key
- `GET /users/me/api-keys/usage` — totals, per-endpoint aggregates, and recent rows derived from **`api_access_log`** (authenticated calls that are **not** tagged with `X-Eduator-Client: web-app`). If the table is missing, the service falls back to legacy **`ai_requests`** rows only.

### Missing Key Error (AI Routes)

When user key is missing, AI routes should return:

```json
{
  "error": "Gemini API key is missing for this user.",
  "code": "MISSING_GEMINI_API_KEY",
  "hint": "Open /school-admin/api-integration and save your Gemini API key."
}
```

## Web Proxy Endpoints (web-app)

- `GET /api/school-admin/documents/:id/file`
  - forwards authenticated request to backend file route
  - supports `?download=1`

## Quick Verification Checklist

1. `GET /health` returns `{ ok: true }`
2. Login succeeds and returns access token
3. `GET /auth/me` works with token
4. `GET /users/me/ai-keys/gemini` returns status
5. `GET /users/me/api-keys` returns `items` (may be empty)
6. AI route returns either generated result or structured missing-key error
7. **Usage (optional):** after `db:migrate`, call `GET /documents` with Bearer **only** (no `X-Eduator-Client`); `GET /users/me/api-keys/usage` should reflect the request

## Notes

- OpenAPI source of truth: `apps/backend/openapi.yaml`
- Full endpoint reference + examples: `apps/backend/API_DOCUMENTATION.md`
