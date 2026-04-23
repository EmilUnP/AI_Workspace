# API Overview

## Base

- API server package: `packages/api-server`
- Default local URL: `http://localhost:4000`

## Authentication

- Supabase-based authentication
- Protected endpoints require bearer token

```http
Authorization: Bearer <token>
```

## Main Domain Areas

- Platform owner operations
- School admin operations
- Teacher operations (classes, lessons, exams, reports)
- AI generation and assistant endpoints

## Current Policy Note

- Student portal UI endpoints are not part of active product surface.
