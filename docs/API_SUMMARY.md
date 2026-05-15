# API Summary (0.2.6)

Base URL (local): `http://localhost:4000/v1`

Authentication (protected routes):

| Client | Header | Notes |
|--------|--------|--------|
| **Eduator web app** (Next.js server) | `Authorization: Bearer <JWT>` + `X-Eduator-Client: web-app` | Login session; Usage tab does **not** log this traffic. |
| **Third-party integrations** (Postman, scripts, partner apps) | `Authorization: Bearer ed_<full_secret>` | HTTP API key from **School admin → API Integration → Create API key**. Documented in-app under Keys & Docs. Usage is attributed per key. |

Do **not** use `POST /auth/login` JWTs for production integrations — create an HTTP API key instead. Omit `X-Eduator-Client: web-app` on external calls so they appear under **API Integration → Usage**.

## API Groups

- **Auth**: register/login/refresh/me
- **Users**: list + password update
- **User HTTP API keys**: list/create/revoke + **usage** analytics (`/users/me/api-keys`, `/users/me/api-keys/usage`)
- **Documents**: upload/list/detail/file/update/delete
- **Lessons (REST)**: list/detail/media stream/delete saved lessons
- **Exams (REST)**: list/stats/detail/create/delete saved exams (camelCase on POST)
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

## Lessons (REST)

- `GET /lessons` — paginated list (`page`, `perPage`, `search`)
- `GET /lessons/:id` — full lesson JSON (content, images, mini_test, etc.)
- `GET /lessons/:id/media/:file` — stream generated image/audio bytes
- `DELETE /lessons/:id` — delete saved lesson and related media when possible

## Exams (saved rows, REST)

- `GET /exams` — list (`page`, `perPage`, `search`)
- `GET /exams/stats` — aggregate counts
- `GET /exams/:id` — full exam JSON
- `POST /exams` — create (camelCase body, e.g. `durationMinutes`, `isPublished`, `questions`)
- `DELETE /exams/:id` — delete

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
- `DELETE /education-plans/:id` — delete plan
- `POST /ai/translate`
- `POST /ai/tts`
- `POST /ai/stt`
- `POST /ai/image/generate`

## User AI Key

- `GET /users/me/ai-keys/gemini` - Gemini key status for authenticated user
- `PUT /users/me/ai-keys/gemini` - save/update authenticated user key
- `DELETE /users/me/ai-keys/gemini` - remove authenticated user key

## User HTTP API keys & usage (0.2.6+)

Requires migration `006_api_access_log.sql` on the backend database.

- `GET /users/me/api-keys` — list active keys (prefix only, never full secret)
- `POST /users/me/api-keys` — create key; response includes **raw key once** in `key`
- `DELETE /users/me/api-keys/:id` — revoke key
- `GET /users/me/api-keys/usage` — totals, **per API key** (`byKey`), per-endpoint aggregates, and recent rows from **`api_access_log`** (`api_key_id` when the call used `Authorization: Bearer ed_…`). Optional query `range=today|30d|all`. Excludes `X-Eduator-Client: web-app` traffic.
- **HTTP API keys** — use `Authorization: Bearer ed_<secret>` on `/v1/*` routes (same as JWT). Requires migration `007_api_access_log_api_key_id.sql`.

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
