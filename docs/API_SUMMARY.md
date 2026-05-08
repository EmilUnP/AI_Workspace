# API Summary (0.2.0)

Base URL (local): `http://localhost:4000/v1`

Authentication: `Authorization: Bearer <accessToken>` required for protected routes.

## API Groups

- **Auth**: register/login/refresh/me
- **Users**: list + password update
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

- `POST /documents` - create document + trigger processing queue
- `GET /documents` - list own documents
- `GET /documents/:id` - get single document
- `GET /documents/:id/file` - stream document file
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
- `POST /ai/education-plans/generate`
- `POST /ai/translate`
- `POST /ai/tts`
- `POST /ai/stt`
- `POST /ai/image/generate`

## User AI Key Management

- `GET /users/me/ai-keys/gemini` - Gemini key status for authenticated user
- `PUT /users/me/ai-keys/gemini` - save/update authenticated user key
- `DELETE /users/me/ai-keys/gemini` - remove authenticated user key

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
5. AI route returns either generated result or structured missing-key error

## Notes

- OpenAPI source of truth: `apps/backend/openapi.yaml`
- Full endpoint reference + examples: `apps/backend/API_DOCUMENTATION.md`
