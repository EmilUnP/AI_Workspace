# Clean Backend API Documentation

This is the full API contract for the clean backend running in `apps/backend` (**documentation baseline 0.2.7**).

## Base
- Base URL: `http://localhost:<PORT>`
- API prefix: `/v1`
- Health: `GET /health`

## Auth Model

Two clients, two credentials:

| Client | Credential | Header |
|--------|------------|--------|
| **Eduator web app** (Next.js) | JWT from `POST /v1/auth/login` | `Authorization: Bearer <accessToken>` plus `X-Eduator-Client: web-app` (UI traffic is not logged in API Integration → Usage). |
| **Third-party integrations** | HTTP API key (`ed_…`) from `POST /v1/users/me/api-keys` | `Authorization: Bearer ed_<full_secret>` — omit `X-Eduator-Client: web-app` so Usage attributes calls to the key. |

Protected routes accept **either** a valid JWT or a valid HTTP API key. Prefer API keys for Postman, scripts, and partner apps; do not document login JWTs as the integration path.

## Error Format
Most errors return:

```json
{ "error": "Message" }
```

Some operational errors include structured metadata:

```json
{
  "error": "Message",
  "code": "ERROR_CODE",
  "hint": "Actionable next step"
}
```

Validation errors (Zod) are normalized by the global error handler:

```json
{
  "error": "Validation failed",
  "issues": [{ "path": ["field"], "message": "..." }]
}
```

---

## 1) Authentication

### POST `/v1/auth/register`
Create a local user and immediately return tokens.

Request:
```json
{
  "email": "admin@local.dev",
  "password": "StrongPassword123",
  "role": "admin"
}
```

Rules:
- `email`: valid email
- `password`: min 8 chars
- `role`: `admin | operator | user`
- Platform-owner simplified UI integration: create users as `operator` only.

Response `201`:
```json
{
  "user": { "id": "uuid", "email": "admin@local.dev", "role": "admin" },
  "tokens": {
    "accessToken": "jwt",
    "refreshToken": "jwt",
    "tokenType": "Bearer"
  }
}
```

Notes:
- Returns access and refresh tokens for the newly created user.
- Current web platform-owner "Add Operator" form uses this endpoint with:
  - `email`
  - `password`
  - `role: "operator"`

---

### POST `/v1/auth/login`

Request:
```json
{
  "email": "admin@local.dev",
  "password": "StrongPassword123"
}
```

Response `200`: same as register token payload.

---

### POST `/v1/auth/refresh`

Request:
```json
{
  "refreshToken": "jwt"
}
```

Response `200`: new access + refresh token pair.

---

### GET `/v1/auth/me` (Protected)

Response `200`:
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@local.dev",
    "role": "admin",
    "created_at": "2026-04-30T00:00:00.000Z"
  }
}
```

---

## 2) Users

### GET `/v1/users` (Protected)
List users (supports optional query params handled by service/repository).

Response:
```json
{
  "items": [
    { "id": "uuid", "email": "user@local.dev", "role": "user", "created_at": "..." }
  ]
}
```

### PATCH `/v1/users/:id/password` (Protected, **admin only**)

Request:
```json
{
  "password": "NewStrongPassword123"
}
```

Updates the target user's password. Non-admin callers receive `403`.

---

## 2.1) User AI Key Management

### GET `/v1/users/me/ai-keys/gemini` (Protected)
Get Gemini key status for authenticated user.

Response:
```json
{
  "hasKey": true,
  "keyHint": "abcd"
}
```

### PUT `/v1/users/me/ai-keys/gemini` (Protected)
Save or update Gemini key for authenticated user.

Request:
```json
{
  "apiKey": "AIza..."
}
```

Response:
```json
{
  "hasKey": true,
  "keyHint": "abcd"
}
```

### DELETE `/v1/users/me/ai-keys/gemini` (Protected)
Delete Gemini key for authenticated user.

Response:
```json
{
  "hasKey": false,
  "keyHint": null
}
```

---

## 2.2) User HTTP API keys & usage analytics (0.2.6+)

Requires DB migrations `006_api_access_log.sql` and `007_api_access_log_api_key_id.sql` (`npm run db:migrate` from `apps/backend`).

### Authenticating with an HTTP API key

In addition to JWT access tokens, protected routes accept a user HTTP API key:

```http
Authorization: Bearer ed_<hex>
```

The key is the raw value returned once from **POST** `/v1/users/me/api-keys`. Each key belongs to one user; usage is attributed to that key in **`api_access_log.api_key_id`**.

### GET `/v1/users/me/api-keys` (Protected)

Returns active keys for the current user (prefix only; full secret is never returned for existing keys).

### POST `/v1/users/me/api-keys` (Protected)

Create a new API key. Response includes the **raw key once** (store it immediately).

### DELETE `/v1/users/me/api-keys/:id` (Protected)

Revoke/delete a key by id (owner scoped).

### GET `/v1/users/me/api-keys/usage` (Protected)

Query: optional `range=today|30d|all` (default `all`).

Returns aggregate and recent HTTP usage used by the school-admin **Usage** tab:

- Primary source: **`api_access_log`** (`user_id`, optional **`api_key_id`**, method, route pattern, status code, `created_at`).
- **`byKey`**: per HTTP API key (plus an **Other (login token)** bucket when calls used a JWT instead of `ed_…`).
- Rows are **not** recorded for requests that include `X-Eduator-Client: web-app` (official Next.js server traffic).
- Successful API-key calls update **`user_api_keys.last_used_at`**.
- If `api_access_log` is not present yet, the service may fall back to legacy **`ai_requests`** data only.

---

## 3) Documents

### POST `/v1/documents` (Protected)
Create document metadata record (owner-scoped), persist the file when `contentBase64` or `localPath` is provided, then run the same post-upload processing (extraction / RAG) as the first-party app.

**Remote clients and integrations** should send file bytes as **`contentBase64`** (JSON). **`localPath`** is only useful when the file already exists on a path the **backend process** can read (same host or mounted storage).

Request (upload from client — same shape the web app uses):
```json
{
  "title": "Biology Notes",
  "fileName": "biology.pdf",
  "fileType": "application/pdf",
  "fileSize": 234567,
  "contentBase64": "<base64 of file bytes>",
  "metadata": { "source": "third-party-app" }
}
```

Request (metadata + path on backend filesystem only):
```json
{
  "title": "Biology Notes",
  "fileName": "biology.pdf",
  "fileType": "pdf",
  "fileSize": 234567,
  "localPath": "docs/biology.pdf",
  "metadata": { "source": "manual-upload" }
}
```

Rules:
- `title`: 1..200
- `fileName`: required
- `fileType`: required (MIME or short type; for RAG extraction prefer `pdf | docx | doc | txt` and related MIME strings)
- `fileSize`: integer >= 0 (should match actual decoded size when using `contentBase64`)
- `contentBase64`: optional; when present (and `localPath` not used), the API writes the file under `AI_STORAGE_DIR` and processes it
- `localPath`: optional; path on the backend machine (or under storage root); use when the file is not sent in the body

Response `201`:
```json
{ "document": { "id": "uuid", "...": "..." } }
```

---

### GET `/v1/documents` (Protected)
List only the authenticated user's documents.

Response:
```json
{ "items": [{ "id": "uuid", "title": "Biology Notes", "...": "..." }] }
```

---

### GET `/v1/documents/:id` (Protected)
Get single owner-scoped document.

Response:
```json
{ "document": { "id": "uuid", "title": "Biology Notes", "...": "..." } }
```

404 when not found or not owned.

---

### GET `/v1/documents/:id/file` (Protected)

Streams the original uploaded file (binary). Sets `Content-Type` and `Content-Disposition` appropriately.

---

### PATCH `/v1/documents/:id` (Protected)

Update owner-scoped metadata (at minimum `title`; optional `description`, `tags`).

Request:
```json
{
  "title": "Updated title",
  "description": "Optional description",
  "tags": ["math", "chapter-1"]
}
```

Response `200`:
```json
{ "document": { "id": "uuid", "...": "..." } }
```

---

### DELETE `/v1/documents/:id` (Protected)

Deletes the database row and removes the file from storage when present.

Response `200`:
```json
{ "success": true }
```

`404` when not found or not owned.

---

## 4) AI Request Tracking (Generic)

### POST `/v1/ai/requests` (Protected)
Current phase-1 behavior accepts request and stores completed placeholder result.

Request:
```json
{
  "type": "custom_task",
  "payload": { "topic": "photosynthesis" }
}
```

Response `201`:
```json
{
  "request": {
    "id": "uuid",
    "status": "completed",
    "result": {
      "message": "AI request accepted in clean backend phase-1",
      "echo": { "topic": "photosynthesis" }
    }
  }
}
```

---

### GET `/v1/ai/requests/:id` (Protected)
Get one request by id (owner-scoped).

---

## 5) AI RAG

### POST `/v1/ai/rag/retrieve` (Protected)
Retrieve top relevant chunks from one document.

Request:
```json
{
  "documentId": "uuid",
  "query": "Explain mitochondria",
  "topK": 5
}
```

Response:
```json
{
  "documentId": "uuid",
  "chunks": ["...", "..."]
}
```

Missing Gemini key example:
```json
{
  "error": "Gemini API key is missing for this user.",
  "code": "MISSING_GEMINI_API_KEY",
  "hint": "Open /school-admin/api-integration and save your Gemini API key."
}
```

---

## 6) AI Chat (assistant)

Conversations are **owner-scoped** (same user as your HTTP API key or JWT). JSON bodies use **camelCase** (`documentIds`, `shortAnswer`).

**Third-party quick flow:** `POST /v1/ai/chat/conversations` → copy `conversation.id` → `POST /v1/ai/chat/conversations/:id/messages` with `{ "message": "...", "documentIds": [], "shortAnswer": true }`. Repeat on the **same** `:id` to continue; prior messages are included in the model prompt. Requires a **Gemini API key** on the account (see §2.1) and migration `008_teacher_chat.sql`.

### GET `/v1/ai/chat/conversations` (Protected)

Response `200`:
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Untitled",
      "document_ids": [],
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### POST `/v1/ai/chat/conversations` (Protected)

Create a conversation. Optional body:

```json
{
  "title": "Biology Q&A",
  "documentIds": ["uuid-doc-1", "uuid-doc-2"]
}
```

- When `documentIds` is provided (non-empty), the server persists them on the new conversation before responding.

Response `201`:
```json
{ "conversation": { "id": "uuid", "title": "...", "document_ids": [] } }
```

### GET `/v1/ai/chat/conversations/:id` (Protected)

Returns the conversation **with recent messages** embedded (shape from `TeacherChatbotService.getConversation`).

### PATCH `/v1/ai/chat/conversations/:id` (Protected)

Partial update (validated). Allowed fields:

```json
{
  "title": "Renamed thread",
  "documentIds": ["uuid-doc-1"]
}
```

Both fields are optional; send only what changes.

### DELETE `/v1/ai/chat/conversations/:id` (Protected)

Response `200`:
```json
{ "success": true }
```

### POST `/v1/ai/chat/conversations/:id/messages` (Protected)

Send a user message; response includes the assistant reply and suggested follow-ups.

Request:
```json
{
  "message": "Summarize the key ideas from my selected documents.",
  "documentIds": ["uuid-doc-1"],
  "shortAnswer": false
}
```

- `message` (string, required)
- `documentIds` (UUID array, optional; up to **3** document IDs are used for RAG context)
- `shortAnswer` (boolean, default `true`) — when `true`, the assistant uses a concise style

Response `200`:
```json
{
  "message": { "id": "uuid", "role": "assistant", "content": "..." },
  "followups": ["...", "..."]
}
```

---

## 6.1) Lessons (saved content) — REST

These routes expose **persisted** lessons (including rows created by `POST /v1/ai/lessons/generate`). All routes are **owner-scoped**.

### GET `/v1/lessons` (Protected)

Paginated list. Query:

- `page` (default `1`)
- `perPage` (default `10`, max `50`)
- `search` (optional; matches `title` and `topic`)

Response `200`:
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Fractions",
      "duration_minutes": 45,
      "languages": ["en"],
      "objectivesCount": 4,
      "created_at": "..."
    }
  ],
  "total": 123,
  "page": 1,
  "perPage": 10
}
```

### GET `/v1/lessons/:id` (Protected)

Full lesson payload for viewing/editing clients.

Response `200` (abridged):
```json
{
  "lesson": {
    "id": "uuid",
    "title": "...",
    "topic": "...",
    "description": "...",
    "created_at": "...",
    "duration_minutes": 45,
    "audio_url": "/v1/lessons/uuid/media/audio.wav",
    "content": {},
    "images": [],
    "mini_test": {},
    "metadata": {},
    "learning_objectives": [],
    "documents": { "title": "Source document title" }
  }
}
```

- `audio_url` may be `null` until async TTS completes; the API may also expose a file-backed URL under `/v1/lessons/:id/media/...` when a wave file exists on disk.

### GET `/v1/lessons/:id/media/:file` (Protected)

Streams generated lesson media (e.g. `audio.wav`, `image_0.png`) after verifying lesson ownership. `:file` must be a basename (path traversal is rejected).

### DELETE `/v1/lessons/:id` (Protected)

Deletes the lesson row and **best-effort** removes `AI_STORAGE_DIR/lessons/:id/` (images/audio).

Response `200`:
```json
{ "ok": true }
```

---

## 7) AI Lesson Generation

### POST `/v1/ai/lessons/generate` (Protected)

Request:
```json
{
  "documentId": "uuid",
  "topic": "Photosynthesis",
  "language": "en",
  "gradeLevel": "grade_9",
}
```

Response `201`:
```json
{
  "lesson": {
    "id": "uuid",
    "title": "...",
    "description": "...",
    "duration_minutes": 45,
    "learning_objectives": ["..."],
    "content": "...",
    "mini_test": {}
  }
}
```

---

## 8) AI Exam Generation

### POST `/v1/ai/exams/generate` (Protected)

Supports:
- direct `documentText`
- `documentId`
- `documentIds` (multi-doc)

Request example:
```json
{
  "documentIds": ["uuid"],
  "gradeLevel": "grade_9",
  "language": "en",
  "questionCount": 10,
  "topics": ["photosynthesis"],
  "questionTypes": ["multiple_choice", "true_false"],
  "difficultyDistribution": { "easy": 3, "medium": 5, "hard": 2 }
}
```

Response `201`:
```json
{
  "exam": {
    "id": "uuid",
    "title": "...",
    "description": "...",
    "questions": [{ "...": "..." }]
  }
}
```

---

### POST `/v1/ai/exams/translate` (Protected)

Request:
```json
{
  "questions": [{ "id": "q1", "question": "..." }],
  "targetLanguage": "az"
}
```

Response:
```json
{
  "questions": [{ "...": "translated..." }]
}
```

---

### Exams (saved rows) — REST

These routes manage **persisted** exams (including rows created by `POST /v1/ai/exams/generate` or `POST /v1/exams`). JSON bodies for write routes use **camelCase** to match the web app (`durationMinutes`, `questions`, …).

#### GET `/v1/exams` (Protected)

Query:

- `page` (default `1`)
- `perPage` (default `10`, max `50`)
- `search` (optional; matches `title`)

Response `200`:
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Quiz 1",
      "description": null,
      "topics": ["algebra"],
      "languages": ["en"],
      "questionCount": 10,
      "duration_minutes": 60,
      "created_at": "..."
    }
  ],
  "total": 42,
  "page": 1,
  "perPage": 10
}
```

#### GET `/v1/exams/stats` (Protected)

Aggregate counts for the authenticated user.

Response `200`:
```json
{
  "total": 10,
  "totalQuestions": 120
}
```

#### GET `/v1/exams/:id` (Protected)

Response `200` (abridged):
```json
{
  "exam": {
    "id": "uuid",
    "title": "...",
    "description": null,
    "grade_level": "10",
    "duration_minutes": 60,
    "language": "en",
    "questions": [],
    "translations": {},
    "settings": {},
    "topics": [],
    "created_at": "..."
  }
}
```

#### POST `/v1/exams` (Protected)

Creates an exam row from a full question payload (same path the web app uses when saving a manually built exam).

Request (typical):
```json
{
  "title": "Midterm",
  "description": null,
  "gradeLevel": "10",
  "durationMinutes": 60,
  "language": "en",
  "questions": [],
  "topics": [],
  "translations": {},
  "settings": {}
}
```

Response `201`:
```json
{ "exam": { "id": "uuid" } }
```

#### PATCH `/v1/exams/:id` (Protected)

Partial update. Supported fields include: `title`, `description`, `gradeLevel`, `durationMinutes`, `language`, `questions`, `metadata`.

Response `200`:
```json
{ "exam": { "id": "uuid" } }
```

#### DELETE `/v1/exams/:id` (Protected)

Response `200`:
```json
{ "ok": true }
```

---

## 9) Education plans

### REST: `GET` / `POST` / `PATCH` / `DELETE` `/v1/education-plans` (Protected)

Saved plan rows (including those created by `POST /v1/ai/education-plans/generate`) are listed and managed here. **GET** returns **full** rows (including `content`). **POST** / **PATCH** use **snake_case** fields as stored in the database.

- **`GET /v1/education-plans`** — `{ "items": [ ... ] }`. Query: optional `search` (matches `name` / `description`). There is **no** separate `GET .../stats` or `GET .../:id`; use the list to locate a plan by `id`.
- **`POST /v1/education-plans`** — `201` `{ "plan": { "id" } }`.
- **`PATCH /v1/education-plans/:id`** — partial update; `200` `{ "plan": { "id" } }`.
- **`DELETE /v1/education-plans/:id`** — `200` `{ "ok": true }` or `404`.

#### GET list — response item shape (abridged)

```json
{
  "id": "uuid",
  "name": "Semester plan",
  "description": null,
  "period_months": 3,
  "sessions_per_week": 3,
  "hours_per_session": 1,
  "audience": "Grade 10",
  "document_ids": ["uuid-doc"],
  "content": [],
  "created_at": "..."
}
```

#### POST — request body

```json
{
  "name": "Semester plan",
  "description": null,
  "period_months": 3,
  "sessions_per_week": 3,
  "hours_per_session": 1,
  "audience": "Grade 10",
  "document_ids": ["uuid-doc"],
  "content": []
}
```

#### PATCH — supported fields

Any subset of: `name`, `description`, `period_months`, `sessions_per_week`, `hours_per_session`, `audience`, `document_ids`, `content`.

### AI: `POST` `/v1/ai/education-plans/generate` (Protected)

Request:
```json
{
  "documentId": "uuid",
  "name": "Grade 9 Biology Plan",
  "language": "az",
  "periodMonths": 3,
  "sessionsPerWeek": 3,
  "hoursPerSession": 1
}
```

- **`language`** (or **`outputLanguage`**, same meaning): ISO-style code (`en`, `az`, `tr`, `ru`, …). The model is instructed to write **all** week titles, session text, and objectives in that language (not only the plan name). If omitted, defaults to `en`.

Response `201`:
```json
{
  "plan": {
    "id": "uuid",
    "content": [{ "...": "..." }]
  }
}
```

---

## 10) AI Translation + Media

### POST `/v1/ai/translate` (Protected)
```json
{ "text": "Hello world", "toLanguage": "az" }
```
Response:
```json
{ "translatedText": "..." }
```

### POST `/v1/ai/tts` (Protected)
Phase-1 placeholder response:
```json
{ "text": "Read this aloud" }
```

### POST `/v1/ai/stt` (Protected)
Phase-1 placeholder response:
```json
{ "text": "pretend transcript source" }
```

### POST `/v1/ai/image/generate` (Protected)
```json
{ "prompt": "A clean classroom illustration" }
```

---

## End-to-End Quick Start
1. `npm run db:migrate`
2. `npm run db:seed`
3. `npm run dev`
4. `GET /health`
5. Register -> Login -> copy access token
6. Call protected endpoints with Bearer token

Use `apps/backend/requests.http` for quick manual calls.
