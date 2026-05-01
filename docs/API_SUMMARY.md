# API Summary (0.1.0)

Base URL (local): `http://localhost:4000/v1`

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

## Web Proxy Endpoints (web-app)

- `GET /api/school-admin/documents/:id/file`
  - forwards authenticated request to backend file route
  - supports `?download=1`
