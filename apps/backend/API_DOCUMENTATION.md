# Clean Backend API Documentation

This is the full API contract for the clean backend running in `apps/backend`.

## Base
- Base URL: `http://localhost:<PORT>`
- API prefix: `/v1`
- Health: `GET /health`

## Auth Model
- Access type: Bearer JWT
- Send header on protected routes:
  - `Authorization: Bearer <accessToken>`

## Error Format
Most errors return:

```json
{ "error": "Message" }
```

Validation errors (Zod) are normalized by the global error handler:

```json
{
  "error": "Validation error",
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

---

## 3) Documents

### POST `/v1/documents` (Protected)
Create document metadata record (owner-scoped).

Request:
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
- `fileType`: required (for RAG extraction use `pdf | docx | doc | txt`)
- `fileSize`: integer >= 0
- `localPath`: optional; needed for automatic extraction if `extracted_text` empty

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

---

## 6) AI Chat (Teacher Assistant)

### GET `/v1/ai/chat/conversations` (Protected)
List conversations for user.

### POST `/v1/ai/chat/conversations` (Protected)
Create conversation.

Request:
```json
{ "title": "Grade 9 Biology Help" }
```

### POST `/v1/ai/chat/conversations/:id/messages` (Protected)
Send message and receive assistant response.

Request:
```json
{
  "message": "Give me 3 classroom activities about cell division",
  "documentIds": ["uuid"],
  "shortAnswer": false
}
```

Response:
```json
{
  "message": { "id": "uuid", "content": "..." },
  "followups": ["...", "...", "..."]
}
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
  "subject": "Biology"
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
  "subject": "Biology",
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

## 9) AI Education Plan Generation

### POST `/v1/ai/education-plans/generate` (Protected)

Request:
```json
{
  "documentId": "uuid",
  "name": "Grade 9 Biology Plan",
  "language": "en",
  "periodMonths": 3,
  "sessionsPerWeek": 3,
  "hoursPerSession": 1
}
```

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
