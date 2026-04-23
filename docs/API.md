# Eduator AI API Documentation

**Version:** 2.1.0  
**Base URL:** `https://api.eduator.ai/api/v1`  
**Documentation UI:** [Swagger UI](http://localhost:4000/docs) (development)

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [User Roles](#user-roles)
- [Base URL & Versioning](#base-url--versioning)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Health & Info](#health--info)
  - [Profile Management](#profile-management)
  - [Platform Owner](#platform-owner)
  - [School Admin](#school-admin)
  - [Teacher](#teacher)
  - [Student](#student)
- [AI-Powered Features](#ai-powered-features)
- [Examples](#examples)

---

## Overview

The Eduator AI API provides a comprehensive RESTful interface for managing educational institutions, users, classes, exams, lessons, documents, and AI-powered educational features.

### Key Features

- **AI-Powered Exam Generation**: Generate exams from documents with multi-language support
- **AI Curriculum Architect**: Transform documents into complete multi-lesson courses with final exams
- **AI Tutor Chatbot**: Interactive learning assistant for students
- **Lesson Generation**: AI-generated lessons with images, audio, and quizzes
- **Course Generation**: Multi-lesson course creation with sequential lessons and final exams
- **Smart Calendar Hub**: Visual calendar interface for scheduling lessons and exams with drag-and-drop
- **Document Management**: Upload and manage educational documents with RAG integration
- **Multi-Language Support**: Generate and translate content to 8+ languages
- **Role-Based Access Control**: Secure endpoints based on user roles
- **Real-Time Analytics**: Progress tracking and performance analytics
- **Universal AI Agent**: Intelligent assistant for Platform Owners and School Admins

---

## Authentication

The REST API server accepts **two** authentication methods for teacher endpoints:

1. **JWT (Supabase Auth)** — for the web app and session-based access.
2. **API key** — for third-party integrations; teachers create and manage keys in the app (see [Teacher API Integration (in-app)](#teacher-api-integration-in-app-erp)).

Use the same header for both:

```http
Authorization: Bearer <your-jwt-token-or-api-key>
```

- If the value looks like `edsk_...`, the server treats it as an API key, looks it up in `teacher_api_keys`, and authenticates as that teacher. The teacher’s profile must have `metadata.api_integration_enabled === true` (set by a school admin).
- Otherwise the server treats it as a JWT and validates it with Supabase Auth.

### Obtaining a JWT (web app)

Tokens are obtained through the Supabase Auth flow in the frontend application. Use the `@eduator/auth` package:

```typescript
import { signInWithPassword } from '@eduator/auth'

const { data, error } = await signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Token is automatically stored in Supabase session
```

### Obtaining an API key (third-party)

Teachers **create API keys in the ERP web app** at **Settings → API Integration** (or **/teacher/api-integration**). They give the key a name, create it, and **copy the secret once** (it is shown only at creation). Use that value as `Authorization: Bearer <api_key>`. There is no REST endpoint to create keys; key lifecycle is managed only in the app. See [Teacher API Integration (in-app)](#teacher-api-integration-in-app-erp).

### Token Expiration

JWT tokens expire after the session duration (configured in Supabase). Refresh tokens are handled automatically by the Supabase client. **API keys** do not expire unless revoked by the teacher in the app.

---

## User Roles

The API uses role-based access control (RBAC) with the following roles:

| Role | Description | Access Level |
|------|-------------|--------------|
| **Platform Owner** | Full platform administrator | Can manage all organizations and users across the platform |
| **School Admin** | Organization administrator | Can manage users, classes, and settings within their organization |
| **Teacher** | Educational content creator | Can create exams, lessons, courses, manage classes, view analytics, run courses |
| **Student** | Learner | Can take exams, use AI tutor, track progress, join classes, take courses |

---

## Base URL & Versioning

### Base URL

- **Development**: `http://localhost:4000/api/v1`
- **Production**: `https://api.eduator.ai/api/v1`

### Versioning

The API uses URL-based versioning. Current version is **v1**, accessible at `/api/v1`.

Future versions will be available at `/api/v2`, `/api/v3`, etc. The current version will be maintained for backward compatibility.

### API Architecture: REST API Server vs Next.js Routes

- **REST API server** (`@eduator/api-server`, default `http://localhost:4000`): All endpoints under `/api/v1` listed in this document (health, profile, platform-owner, school-admin, teacher, student) are implemented here. Use this base URL for standalone API access, integrations, and Swagger UI at `http://localhost:4000/docs`.
- **Next.js API routes** (ERP app and ERP app): Some features are implemented as Next.js route handlers (e.g. `/api/teacher/courses`, `/api/teacher/education-plans/generate`, `/api/teacher/lessons/[id]/language`, `/api/school-admin/reports/overview`, `/api/auth/login`). These run in the app (e.g. `localhost:3001`) and are used by the frontend; they are not part of the standalone REST API server. Where applicable, this doc notes "Next.js only" and the path relative to the app.

---

## Response Format

### Success Response

All successful API responses follow this structure:

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Optional success message"
}
```

### Paginated Responses

Endpoints that support pagination return:

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

---

## Error Handling

### Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      // Additional error details (validation errors, etc.)
    ]
  }
}
```

### HTTP Status Codes

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| `200` | OK | Request succeeded |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request data or validation error |
| `401` | Unauthorized | Missing or invalid authentication token |
| `403` | Forbidden | User lacks permission for the requested action |
| `404` | Not Found | Resource not found |
| `402` | Payment Required | Insufficient token balance for the requested AI action (exam/lesson/course generation, chat) |
| `409` | Conflict | Resource conflict (e.g., duplicate entry) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |

### Common Error Codes

| Error Code | Description |
|------------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `NOT_FOUND` | Resource not found |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `ALREADY_EXISTS` | Resource already exists |
| `CREATE_FAILED` | Resource creation failed |
| `UPDATE_FAILED` | Resource update failed |
| `DELETE_FAILED` | Resource deletion failed |
| `INSUFFICIENT_TOKENS` | Not enough tokens for this AI action; error message includes required amount and current balance |

---

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Default Limit**: 100 requests per minute per IP
- **Headers**: Rate limit information is included in response headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in window
  - `X-RateLimit-Reset`: Timestamp when limit resets

When rate limit is exceeded, a `429 Too Many Requests` response is returned.

---

## API Endpoints

### Health & Info

#### `GET /` (API root)

Root endpoint. No authentication required. Returns product name, version, and links to docs and health.

**Response:** `{ "name", "version", "docs", "health", "api" }`

#### `GET /health`

Health check endpoint. No authentication required.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-14T10:00:00Z",
  "version": "0.16.0"
}
```

#### `GET /ready`

Readiness check endpoint. No authentication required.

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2025-01-14T10:00:00Z",
  "services": {
    "database": "healthy",
    "api": "healthy"
  }
}
```

*(`status` is `"ready"` or `"not_ready"` depending on dependency health.)*

#### `GET /api/v1`

API information endpoint. No authentication required.

**Response:**
```json
{
  "name": "Eduator AI API",
  "version": "0.16.0",
  "description": "AI-Powered Educational Platform API",
  "documentation": "/docs",
  "endpoints": {
    "health": "/health",
    "docs": "/docs",
    "platformOwner": "/api/v1/platform-owner",
    "schoolAdmin": "/api/v1/school-admin",
    "teacher": "/api/v1/teacher",
    "student": "/api/v1/student"
  }
}
```

---

### Profile Management

#### `GET /api/v1/profile`

Get current user's profile. Requires authentication.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "profile_type": "teacher",
    "organization_id": "uuid",
    "avatar_url": "https://...",
    "metadata": {},
    "created_at": "2025-01-14T10:00:00Z",
    "updated_at": "2025-01-14T10:00:00Z"
  }
}
```

For **teachers**, `metadata` may include public-profile fields (e.g. headline, bio, subjects, certificates, visibility settings) used in the app’s “Find Teachers” directory and on the public teacher page. See [Teacher profile in the app](#teacher-profile-in-the-app-web-ui).

#### `PUT /api/v1/profile`

Update current user's profile. Requires authentication.

**Request Body:**
```json
{
  "full_name": "John Doe",
  "phone": "+1234567890",
  "avatar_url": "https://...",
  "metadata": {}
}
```

- **`metadata`** (optional): Arbitrary object. For **teachers**, the app and schema support fields such as `bio`, `department`, `subject_areas` (array of strings), `grade_levels`, `certifications`, `years_of_experience`, `preferred_language` (2-letter code), `timezone`, `notifications_enabled`, `api_integration_enabled`. In the **ERP app**, the teacher’s public profile (headline, bio, subjects, certificates, visibility toggles) is stored in `metadata` and used for the “Find Teachers” directory; integrators can set or update these via this endpoint so the same profile appears correctly in the app.

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated profile
  }
}
```

---

### Platform Owner

All platform owner endpoints require `platform_owner` role.

#### Organizations

##### `GET /api/v1/platform-owner/organizations`

List all organizations.

**Query Parameters:** `page`, `per_page`, `status` (optional)

**Response:** `{ "success": true, "data": { "items": [...], "pagination": {...} } }`

##### `GET /api/v1/platform-owner/organizations/:id`

Get a single organization by ID.

##### `POST /api/v1/platform-owner/organizations`

Create a new organization. Body: `name`, `email`, `domain`, `status`, etc.

##### `PUT /api/v1/platform-owner/organizations/:id`

Update an organization.

##### `DELETE /api/v1/platform-owner/organizations/:id`

Delete an organization.

##### `PATCH /api/v1/platform-owner/organizations/:id/status`

Update organization status. Body: `{ "status": "suspended" | "active" | "inactive" }`.

#### Users

##### `GET /api/v1/platform-owner/users`

List all users across the platform. Query: `page`, `per_page`, `role`, `approval_status`.

##### `GET /api/v1/platform-owner/users/pending-count`

Get count of users with pending approval.

##### `GET /api/v1/platform-owner/users/search`

Search users. Query parameters as needed by implementation.

##### `GET /api/v1/platform-owner/users/:id`

Get a single user (profile) by ID.

##### `PATCH /api/v1/platform-owner/users/:id/approve`

Approve a pending user. Response: `{ "success", "data", "message" }`.

##### `PATCH /api/v1/platform-owner/users/:id/reject`

Reject a pending user.

##### `PATCH /api/v1/platform-owner/users/:id/suspend`

Suspend a user.

##### `DELETE /api/v1/platform-owner/users/:id`

Delete a user (profile).

#### Reports

##### `GET /api/v1/platform-owner/reports`

Platform dashboard overview: `overview` (total_organizations, total_users, pending_approvals), `organizations` (by_status, by_plan), `users` (by_type, recent_signups), `usage`.

##### `GET /api/v1/platform-owner/reports/analytics`

Detailed analytics with time-series data. Query: date range parameters as defined in the API.

##### `GET /api/v1/platform-owner/reports/usage`

Usage statistics.

#### AI Agent

> **Note**: The AI Agent is available via Server Actions in the Next.js ERP application, not as REST API endpoints. It supports two modes: Think Mode (read-only) and Agent Mode (full CRUD).

**Server Action Usage (Next.js):**

```typescript
import { processThinkMessage, processAgentMessage } from '@/app/api/agent/actions'

// Think Mode (read-only)
const thinkResponse = await processThinkMessage(
  "How many users are in Test organization?",
  { showSql: false, includeMetadata: false }
)

// Agent Mode (full CRUD)
const agentResponse = await processAgentMessage(
  "Create organization named Demo and assign new admin",
  { showSql: false, includeMetadata: false }
)
```

**Response:**
```typescript
{
  text: "There are 9 users in the Test organization.",
  toolCalls?: [
    {
      tool: "execute_sql",
      parameters: {...},
      result: {...}
    }
  ],
  rawData?: [...],
  rowCount?: 1,
  error?: string,
  progress?: {
    steps: [
      { tool: 'create_organization', description: 'Create organization', status: 'completed' },
      { tool: 'create_user', description: 'Create user', status: 'executing' }
    ],
    currentStep: 1,
    totalSteps: 2,
    inProgress: true
  }
}
```

**Capabilities:**

**Think Mode:**
- SQL query execution with RLS enforcement (SELECT only)
- Answer data questions and provide insights
- Blocks all write operations with friendly error messages

**Agent Mode:**
- All Think Mode capabilities
- Create organizations, users, classes, students, teachers
- Multi-step actions with real-time progress tracking
- Automatic language detection and response matching

**Progress Tracking:**
- Real-time progress display for multi-step operations
- Shows list of all steps with status indicators
- Updates as each step completes
- Displays errors for failed steps

**Access:**
- Available in ERP App (`localhost:3001`) for Platform Owners and School Admins
- Integrated as floating chat widget in dashboard layouts
- Mode switching via toggle button in UI
- See `packages/agent/docs/` for detailed documentation

---

### School Admin

All school admin endpoints require `school_superadmin` role and are scoped to the user's organization.

#### `GET /api/v1/school-admin/dashboard`

Get organization dashboard overview.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_teachers": 25,
      "total_students": 500,
      "total_classes": 30,
      "pending_approvals": 5
    },
    "recent_teachers": [...],
    "recent_classes": [...],
    "pending_users": [...]
  }
}
```

#### `GET /api/v1/school-admin/users`

List users in the organization. Query: `profile_type` (`teacher` | `student`), `approval_status` (`pending` | `approved` | `rejected`).

#### `PATCH /api/v1/school-admin/users/:id/approve`

Approve a user within the organization.

#### `PATCH /api/v1/school-admin/users/:id/reject`

Reject a pending user within the organization.

#### `GET /api/v1/school-admin/classes`

List classes in the organization. Query: `page`, `per_page`, `is_active`.

**Response:** `{ "success": true, "data": { "items": [...], "total": number } }`

#### `GET /api/v1/school-admin/reports`

Get organization reports. Response includes `summary` (total_teachers, total_students, total_classes, total_exams) and `performance` (average_exam_score, completion_rate).

#### AI Agent

> **Note**: The AI Agent is available via Server Actions in the Next.js ERP application. See Platform Owner section above for usage details. School Admins have organization-scoped access with the same Server Action interface.

**Capabilities (School Admin):**
- Organization-scoped SQL queries
- Create users, classes, students, teachers within organization
- Query organization-specific data
- All queries automatically filtered by organization_id

---

### Teacher

All teacher endpoints require `teacher` role.

#### Teacher profile in the app (web UI)

In the **web application**, teachers have:

- **Settings** (`/teacher/settings`): Account info (full name, email, role, approval status, organization), password change, and (ERP) a link to **Public profile**. Full name and password are updated in-app via server actions; the same profile can be read/updated via **GET /api/v1/profile** and **PUT /api/v1/profile** (see [Profile Management](#profile-management)).
- **Public profile** (ERP: `/teacher/profile`): What students see in the “Find Teachers” directory and on the teacher’s public page (`/teachers/[id]`). The teacher can edit:
  - **Headline**, **bio**, **subjects**, **certificates**
  - **Avatar** (profile image)
  - **Visibility toggles** (e.g. show/hide avatar, headline, bio, subjects)
  - Stored in the profile’s `metadata` (and, where used, `avatar_url`). Integrators can update these via **PUT /api/v1/profile** with the appropriate `metadata` (and `avatar_url`) so the public profile stays in sync.
- **Contact requests** (ERP): Students can send contact requests to a teacher; the teacher sees and manages them under **Profile → Contact requests** in the app. There is no REST endpoint for contact requests; this is in-app only.
- **Feedback / ratings** (ERP): Students can rate a teacher (e.g. after a course); the teacher sees aggregate ratings and feedback under **Profile → Feedback**. Read-only in the app; no REST API for ratings.

**REST API:** Use **GET /api/v1/profile** to read the current teacher’s profile (including `metadata`) and **PUT /api/v1/profile** to update `full_name`, `avatar_url`, `phone`, and `metadata` so that the teacher’s account and public profile data stay consistent when integrating via API.

#### Teacher API Integration (in-app) (ERP)

In the **ERP web app**, teachers can configure **third-party API integration**: create API keys, view usage, and copy endpoint documentation. This is the only place where API keys are created or revoked; there is no REST endpoint for key lifecycle.

- **Where:** **Teacher → API Integration** (sidebar) or path **`/teacher/api-integration`**. Available only in the **ERP app** (school/organization deployment).
- **Who can see it:** Only teachers whose profile has **`metadata.api_integration_enabled === true`**. This flag is set by a **school administrator** in the user edit screen (e.g. School Admin → Users → [teacher] → enable “API integration”). If not enabled, the page shows a message that the administrator has not enabled API integration and the teacher cannot create keys.

**On the API Integration page:**

1. **Keys & documentation tab**
   - **Create API key:** Teacher enters a key name (e.g. “Production app”), submits; the app generates a secret key (format `edsk_...`). The **secret is shown once** at creation; the teacher must copy it. It is not shown again.
   - **List existing keys:** Each key is shown with: name, key prefix (e.g. `edsk_abc…`), created date, last used date (if any). Teacher can **revoke** a key; revoked keys stop working immediately.
   - **API documentation:** The app displays the **API base URL** (from `NEXT_PUBLIC_API_URL`, e.g. `https://your-api.example.com/api/v1/teacher`) and **example requests** for exam generation and lesson generation (method, path, sample body). Integrators use this base URL plus the API key in the `Authorization: Bearer <api_key>` header.

2. **Usage tab**
   - **Summary:** Total requests, successful count, error count (and success rate).
   - **By API key:** For each key (name, prefix): total requests, success count, error count. Optional filter by key; sort by total or name.
   - **By endpoint:** For each method + path: total, success, error. Optional search/filter by endpoint; sort by total or endpoint.
   - **Recent requests:** List of recent calls: method, endpoint, status (success/error), status code, timestamp. Optional filter by status and endpoint search; limit number shown.

All usage data is recorded by the REST API server when a request is authenticated with an API key; the same key used in `Authorization: Bearer <key>` is attributed in the Usage tab.

**Summary for integrators:** Teachers get the **base URL** and **API key** from this in-app page only. There is no programmatic way to create or list keys via the REST API; key generation and revocation are in-app only.

#### `GET /api/v1/teacher` (REST API server root)

Returns a quick auth check and a list of available teacher endpoints (dashboard, tokens, exams, documents, lessons, classes, analytics). Use to verify your token (200 = valid).

#### Token system (AI features)

AI-powered operations (exam generation, lesson generation, course generation, teacher chat) consume **tokens** from the teacher’s balance. The API:

- **Deducts tokens before** calling the AI. If the balance is too low, the request fails with **402 Payment Required** and a clear error message (e.g. *"Not enough tokens. This action requires X tokens. Your balance: Y. Please buy more tokens or contact your administrator."*).
- **Refunds** tokens if the AI call fails after deduction.
- Exposes the current balance via **GET /api/v1/teacher/tokens** and in the **dashboard** response (`overview.token_balance`). Integrators should check balance before calling generate endpoints and handle 402 in the client.

#### `GET /api/v1/teacher/tokens`

Get the current teacher’s token balance. Use this (or the dashboard) to check balance before exam/lesson/course generation or chat.

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 150
  }
}
```

#### `GET /api/v1/teacher/dashboard`

Get teacher dashboard with overview statistics. Includes token balance for integration use.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_classes": 5,
      "total_exams": 20,
      "total_students": 150,
      "token_balance": 150
    },
    "recent_exams": [...],
    "classes": [...]
  }
}
```

#### Exams

##### `GET /api/v1/teacher/exams`

List teacher's exams.

**Query Parameters:**
- `page` (optional): Page number
- `per_page` (optional): Items per page
- `class_id` (optional): Filter by class
- `is_published` (optional): Filter by published status

##### `POST /api/v1/teacher/exams/generate`

**AI-Powered Exam Generation** - Generate exam questions from documents. Consumes tokens (see [Token system](#token-system-ai-features)); returns **402** with a clear message if balance is insufficient.

**Note (Universal Question Shape):**
The API returns the original fields (**`question`**, **`correct_answer`**) and also includes UI/app aliases (**`text`**, **`correctAnswer`**). This is backward compatible for existing API clients, while allowing generated exams to render consistently inside the Eduator apps.

**Request Body:**
- `language` (optional): **2-letter ISO code** for content language — same as lesson generation. Supported: `en`, `az`, `ru`, `tr`, `de`, `fr`, `es`, `ar`. Default: `en`.

```json
{
  "document_text": "Full document content here...",
  "title": "Biology Exam",
  "subject": "Biology",
  "grade_level": "grade_9",
  "language": "en",
  "settings": {
    "question_count": 20,
    "difficulty_distribution": {
      "easy": 5,
      "medium": 10,
      "hard": 5
    },
    "question_types": ["multiple_choice", "true_false", "fill_blank"],
    "include_explanations": true,
    "include_hints": false
  },
  "custom_instructions": "Focus on photosynthesis"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exam_id": "uuid",
    "questions": [
      {
        "type": "multiple_choice",
        "question": "What is photosynthesis?",
        "text": "What is photosynthesis?",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
        "correctAnswer": "A",
        "difficulty": "medium",
        "points": 5,
        "explanation": "..."
      }
    ],
    "generation_time_ms": 3500,
    "tokens_used": 1500
  }
}
```

##### `PUT /api/v1/teacher/exams/:id`

Update an exam.

##### `PATCH /api/v1/teacher/exams/:id/publish`

Publish an exam (makes it available to students).

##### `DELETE /api/v1/teacher/exams/:id`

Delete an exam.

#### Lessons

##### `POST /api/v1/teacher/lessons/generate`

**AI-Powered Lesson Generation** - Generate a lesson from one or more stored documents (RAG). Consumes tokens; returns **402** if balance is insufficient (see [Token system](#token-system-ai-features)).

**Request Body:**
- `document_id` (optional, legacy): UUID of a single document.
- `documentIds` (optional): Array of document UUIDs for **multi-document RAG**. When provided, the lesson is generated from relevant content across all selected documents. Primary document for storage is `documentIds[0]`. Supported on **Next.js app route** (see below); REST API server accepts single `document_id` only.
- At least one of `document_id` or `documentIds` is required.
- `topic` (required): Lesson topic/title.
- `class_id` (optional): Assign the lesson to a class immediately.
- `language` (optional): **2-letter ISO code** for lesson content — **same as exam generation**. Supported: `en`, `az`, `ru`, `tr`, `de`, `fr`, `es`, `ar`. Default: `en`. Do not send full language names; use codes only so content and DB stay consistent.
- `include` (optional): Preset — `text` (default), `text_and_images`, `text_and_audio`, `full`.
- `options` (optional): `{ includeImages?: boolean, includeAudio?: boolean, centerText?: boolean, includeTables?: boolean, includeFigures?: boolean, includeCharts?: boolean, contentLength?: 'short' | 'medium' | 'full' }`. Content options: **includeTables** (default true) — comparison tables in content; **includeFigures** (default false) — 1–2 figure/diagram descriptions; **includeCharts** (default false) — chart-like data or trend descriptions; **contentLength** — `short` (≈1 page), `medium` (≈2–3 pages), `full` (comprehensive).
- **`objectives`** (optional, **Next.js app route only**): Free-text **manual learning objectives**. When provided, the AI structures the entire lesson around these goals and uses them as the lesson’s `learning_objectives`; when omitted or empty, the AI generates objectives automatically. Use newline- or bullet-separated lines for multiple objectives.
- **`grade_level`** or **`gradeLevel`** (optional, **Next.js app route only**): Target **grade level** so the AI tailors vocabulary, sentence complexity, example depth, and prior knowledge. Supported values: `grade_1` … `grade_12`, `undergraduate`, `graduate`, `phd`. Stored on the lesson for filtering and reporting.

```json
{
  "document_id": "uuid-of-document",
  "topic": "Introduction to Photosynthesis",
  "language": "en",
  "include": "full",
  "options": { "includeImages": true, "includeAudio": true, "centerText": true, "includeTables": true, "includeFigures": false, "includeCharts": false, "contentLength": "medium" }
}
```

**Next.js app route** (`POST /api/teacher/lessons/generate` relative to app): Same as above, plus **`documentIds`** (array), **`objectives`** (string), and **`gradeLevel`** (string). Use the app base URL (e.g. `http://localhost:3002` for ERP, `http://localhost:3001` for ERP) when calling from the frontend.

**Response:** `201` with `{ success: true, data: { lesson_id, title, topic, ... } }`.

**Timeouts:** For `include: "full"` (images + audio), generation can take **1–3 minutes**. Use a client timeout of at least **180 seconds**. If the request times out at the gateway (504), the browser may show a CORS error because the 504 response does not include CORS headers — the real cause is gateway timeout. Redeploy the API with a higher `maxDuration` (e.g. 300s in `packages/api-server/vercel.json`) if you see 504 on full generation.

#### Teacher courses (Next.js app routes only)

Course list, course by ID, course generation, update, publish, and delete are **not** implemented on the REST API server. They are implemented as **Next.js API routes** in the ERP and ERP apps. Use the app base URL (e.g. `http://localhost:3001` for ERP) and the paths below.

| Method | Path (relative to app) | Description |
|--------|------------------------|--------------|
| GET | `/api/teacher/courses` | List teacher's courses |
| GET | `/api/teacher/courses/[id]` | Get course details (if implemented) |
| POST | `/api/teacher/courses/generate` | AI-powered course generation (consumes tokens) |

Request/response shapes for course generation and listing match the descriptions in the following sections; send requests to the app origin, not the standalone API server.

#### Courses (Next.js: `/api/teacher/courses`)

##### `GET /api/teacher/courses` (Next.js app)

List teacher's courses.

**Query Parameters:**
- `page` (optional): Page number
- `per_page` (optional): Items per page
- `is_published` (optional): Filter by published status

##### `GET /api/teacher/courses/:id` (Next.js app)

Get course details with lessons and final exam information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Introduction to Biology",
    "description": "Complete biology course",
    "total_lessons": 5,
    "estimated_duration_minutes": 120,
    "difficulty_level": "grade_9",
    "language": "en",
    "course_style": "serious_academic",
    "lesson_ids": ["uuid1", "uuid2", ...],
    "metadata": {
      "final_exam_id": "uuid",
      "source_documents": ["uuid"]
    },
    "lessons": [...],
    "final_exam": {...}
  }
}
```

##### `POST /api/teacher/courses/generate` (Next.js app)

**AI-Powered Course Generation** - Generate complete multi-lesson course from documents. Consumes tokens (course = many lessons + final exam; typically the most expensive single action); returns **402** if balance is insufficient (see [Token system](#token-system-ai-features)).

**Request Body:**
```json
{
  "document_ids": ["uuid1", "uuid2"],
  "num_lessons": 5,
  "difficulty_level": "grade_9",
  "course_style": "serious_academic",
  "language": "en",
  "subject": "Biology",
  "grade_level": "grade_9",
  "topic": "Optional: Focus on specific topic",
  "lesson_topics": ["Optional: Lesson 1 topic", "Optional: Lesson 2 topic"],
  "exam_settings": {
    "question_count": 20,
    "question_types": ["multiple_choice", "true_false", "fill_blank"],
    "difficulty_distribution": {
      "easy": 5,
      "medium": 10,
      "hard": 5
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "course_id": "uuid",
    "course": {
      "id": "uuid",
      "title": "Introduction to Biology",
      "access_code": "ABC123"
    },
    "lessons": [
      {
        "id": "uuid",
        "title": "Lesson 1: Cell Structure",
        "order": 1,
        "topic": "Cell Biology"
      }
    ],
    "final_exam_id": "uuid",
    "generation_time_ms": 45000,
    "tokens_used": 5000
  }
}
```

##### `PUT /api/teacher/courses/:id` (Next.js app)

Update course details.

**Request Body:**
```json
{
  "title": "Updated Course Title",
  "description": "Updated description",
  "subject": "Biology",
  "grade_level": "grade_10"
}
```

##### `PATCH /api/teacher/courses/:id/publish` (Next.js app)

Publish/unpublish a course.

**Request Body:**
```json
{
  "is_published": true
}
```

##### `DELETE /api/teacher/courses/:id` (Next.js app)

Delete a course (and optionally associated lessons/exam).

#### Classes

##### `GET /api/v1/teacher/classes`

List teacher's classes.

##### `POST /api/v1/teacher/classes`

Create a new class.

**Request Body:**
```json
{
  "name": "Biology 101",
  "description": "Introduction to Biology",
  "subject": "Biology",
  "grade_level": "grade_9"
}
```

##### `GET /api/v1/teacher/classes/:id/students`

Get all students enrolled in a class.

#### Calendar

> **Note**: The Smart Calendar Hub is currently implemented using Next.js Server Actions in the frontend application (`/teacher/calendar`), not as REST API endpoints. The calendar functionality includes scheduling materials, managing events, and class filtering.

**Server Actions (Next.js):**

```typescript
// Schedule a material (exam or lesson) to a time slot
import { scheduleMaterial } from '@/app/teacher/calendar/actions'

const result = await scheduleMaterial(
  materialId: string,
  type: 'exam' | 'lesson',
  startTime: Date,
  endTime: Date,
  classIds: string[]
)

// Update a scheduled event
import { updateScheduledEvent } from '@/app/teacher/calendar/actions'

const result = await updateScheduledEvent(
  eventId: string,
  type: 'exam' | 'lesson',
  updates: {
    startTime?: Date,
    endTime?: Date,
    classId?: string
  }
)

// Delete a scheduled event (unschedule)
import { deleteScheduledEvent } from '@/app/teacher/calendar/actions'

const result = await deleteScheduledEvent(
  eventId: string,
  type: 'exam' | 'lesson'
)
```

**Features:**
- Drag-and-drop scheduling from drafts sidebar to calendar slots
- Reschedule existing events by dragging to new time slots
- Class filtering and auto-selection
- Support for both exams and lessons scheduling
- Real-time calendar updates after scheduling
- Working hours view (9:00 AM - 6:00 PM) with 24-hour toggle

**Database Schema:**
- `exams` table: `start_time`, `end_time` columns (TIMESTAMP WITH TIME ZONE)
- `lessons` table: `start_time`, `end_time` columns (TIMESTAMP WITH TIME ZONE) - added in v0.7.5
- Both tables support calendar scheduling with class assignment

#### Analytics

##### `GET /api/v1/teacher/analytics`

Get teacher analytics and performance metrics.

#### Teacher reports (Next.js routes in app)

> **Note**: Teacher reporting routes below are implemented as Next.js API routes in the app (not Fastify REST `/api/v1` routes). Use app origin (`localhost:3002` ERP / `localhost:3001` ERP when available).

##### `GET /api/teacher/reports`

Teacher reporting aggregate endpoint with filter-driven response.

**Query parameters:**
- `tab`: `overview | exams | lessons | classes`
- `classId`: optional class UUID
- `startDate`: optional date string (`YYYY-MM-DD`), defaults to current month start when omitted
- `endDate`: optional date string (`YYYY-MM-DD`), defaults to current date when omitted

**Response highlights:**
- report totals and tab datasets
- `deltas` for period-over-period comparison
- `insights` with recommendation metadata (`targetTab`, `href`, `actionLabel`)

##### `GET /api/teacher/reports/classes/:id`

Class drilldown endpoint.

**Query parameters:**
- `startDate`: optional date string (`YYYY-MM-DD`)
- `endDate`: optional date string (`YYYY-MM-DD`)

**Response highlights:**
- class summary metrics (`studentCount`, `averageScore`, `passRate`)
- risk distribution
- class trend points
- student rows with risk level and performance

##### `GET /api/teacher/reports/students/:id`

Student drilldown endpoint.

**Query parameters:**
- `startDate`: optional date string (`YYYY-MM-DD`)
- `endDate`: optional date string (`YYYY-MM-DD`)
- `classId`: optional class UUID (to scope student analytics to one class)

**Response highlights:**
- student summary (`averageScore`, `passRate`, `submissions`, `completedLessons`)
- score trend points
- activity timeline (exam submissions / lesson completion)

---

### Student

All student endpoints require `student` role.

#### `GET /api/v1/student/dashboard`

Get student dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "enrolled_classes": 5,
      "available_exams": 10,
      "completed_exams": 3,
      "average_score": 85.5
    },
    "classes": [...],
    "upcoming_exams": [...]
  }
}
```

#### Classes

##### `GET /api/v1/student/classes`

List enrolled classes.

##### `POST /api/v1/student/classes/join`

Join a class using a class code.

**Request Body:**
```json
{
  "code": "ABC123"
}
```

#### Exams

##### `GET /api/v1/student/exams`

List available exams (published exams in enrolled classes).

##### `GET /api/v1/student/exams/:id`

Get exam details for taking (excludes correct answers).

##### `POST /api/v1/student/exams/:id/start`

Start an exam attempt.

##### `POST /api/v1/student/exams/:id/submit`

Submit exam answers.

**Request Body:**
```json
{
  "answers": {
    "question_id_1": "selected_answer",
    "question_id_2": "text_answer"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 85.5,
    "total_points": 100,
    "correct_answers": 17,
    "total_questions": 20,
    "results": [...]
  }
}
```

#### AI Tutor

##### `POST /api/v1/student/chatbot`

Chat with the AI tutor chatbot.

**Request Body:**
```json
{
  "message": "Explain photosynthesis",
  "conversation_id": "optional-conversation-id",
  "context": {
    "class_id": "uuid",
    "subject": "Biology"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Photosynthesis is the process...",
    "conversation_id": "uuid",
    "suggestions": ["Tell me more", "Give examples"]
  }
}
```

#### Progress

##### `GET /api/v1/student/progress`

Get student progress and analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "average_score": 85.5,
      "exams_completed": 10,
      "exams_pending": 5
    },
    "by_class": [...],
    "by_subject": [...]
  }
}
```

---

## AI-Powered Features

### Exam Generation

The API uses Google Gemini AI to generate exam questions from documents. Key features:

- **Document Processing**: Extracts content from uploaded documents
- **Question Type Distribution**: Configurable counts per question type
- **Difficulty Levels**: Easy, Medium, Hard distribution
- **Multi-Language**: Generate in source language, translate to 8+ languages
- **Custom Instructions**: Provide specific guidance for question generation

### AI Tutor Chatbot

Interactive learning assistant powered by Google Gemini:

- **Context-Aware**: Understands student's class and subject context
- **Adaptive Responses**: Adjusts explanation level based on grade level
- **Conversation Memory**: Maintains conversation context
- **Educational Focus**: Designed for teaching, not just answering

### Lesson Generation

AI-powered lesson creation with RAG and optional teacher controls:

- **Document-Based (RAG)**: Generate lessons from one or more uploaded documents. **Multi-document RAG** (app route): pass `documentIds`; the lesson is built from relevant chunks across all selected documents; primary document for storage is the first in the array.
- **Manual Learning Objectives** (app route: `objectives`): Optional free-text objectives. When provided, the AI structures the **entire lesson** around these goals and uses them as the lesson’s `learning_objectives`; content, examples, and mini-test questions align with them. When omitted, the AI generates objectives automatically.
- **Grade Level** (app route: `gradeLevel` / `grade_level`): Optional target grade (e.g. `grade_1`–`grade_12`, `undergraduate`, `graduate`, `phd`). The AI tailors **vocabulary**, **sentence complexity**, **example depth**, and **prior knowledge** to the level. Value is stored on the lesson for filtering and reporting.
- **Topic-Based**: Required `topic` (lesson title); generation is context-aware from the selected document(s).
- **Rich Content**: Optional images (e.g. Google Imagen), audio narration (TTS), examples, tables, figures, charts; control via `include` preset or `options`.
- **Mini-Tests**: Auto-generated quiz questions; content length configurable (`short` | `medium` | `full`).
- **Multi-Language**: Use **2-letter language codes** (`en`, `az`, `ru`, `tr`, `de`, `fr`, `es`, `ar`) — same as exam generation. Do not send full names (e.g. use `az` not "Azerbaijani").
- **Audio Regeneration**: Regenerate audio for existing lessons without regenerating the whole lesson.

### Course Generation (AI Curriculum Architect)

AI-powered multi-lesson course creation (v0.7.0):

- **Document-Based**: Transform documents into complete course structures
- **Multi-Lesson Generation**: Create sequential lessons with proper ordering
- **Final Exam Generation**: Automatic exam creation with configurable parameters
- **Agentic AI**: Uses ReAct pattern for intelligent reasoning and content generation
- **Visual Gap Detection**: Identifies learning material gaps
- **Background Audio**: TTS audio generation for all lessons
- **Configurable Parameters**:
  - Number of lessons (1-10)
  - Difficulty level
  - Course style (Serious & Academic, Fun & Gamified)
  - Optional course topic for focused content
  - Optional lesson topics for controlled generation
  - Exam settings (question count, types, difficulty distribution)
- **Multi-Language**: Full translation support

### Universal AI Agent

> **Note**: The AI Agent is available via Server Actions in the Next.js ERP application, not as REST API endpoints.

**Access**: Available in ERP App (`localhost:3001`) for Platform Owners and School Administrators

**Server Action**: `processAgentMessage(message: string, options?: { showSql?: boolean, includeMetadata?: boolean })`

**Capabilities**:
- **SQL Query Execution**: Execute SELECT queries with automatic RLS enforcement
- **Administrative Actions**: Create organizations, users, classes, students, teachers via natural language
- **Multi-Step Actions**: Handle complex requests (e.g., create organization + admin in one request)
- **Query Normalization**: Automatically handles common mistakes (users → profiles, automatic JOINs)
- **AI-Powered Formatting**: Human-readable result formatting
- **Multi-Language Support**: Automatic language detection and response matching

**Example Usage**:
```typescript
import { processAgentMessage } from '@/app/api/agent/actions'

// Query data
const response = await processAgentMessage(
  'How many users are in Test organization?'
)

// Create entities
const response = await processAgentMessage(
  'Create a new organization called "Demo School" and assign a school admin to it'
)
```

**Response Format**:
```typescript
{
  text: string                    // Human-readable response
  toolCalls?: ToolCall[]         // Tools that were executed
  rawData?: any[]                // Raw query results
  rowCount?: number              // Number of rows returned
  error?: string                 // Error message if any
}
```

**Documentation**: See `packages/agent/docs/` for complete API reference and examples

---

## Examples

### Example: Generate Exam from Document

```typescript
// Using @eduator/api-client
import { apiClient } from '@eduator/api-client'

const response = await apiClient.post('/api/v1/teacher/exams/generate', {
  document_text: documentContent,
  title: 'Biology Midterm',
  subject: 'Biology',
  grade_level: 'grade_10',
  language: 'en',
  settings: {
    question_count: 25,
    difficulty_distribution: {
      easy: 5,
      medium: 15,
      hard: 5
    },
    question_types: ['multiple_choice', 'true_false', 'fill_blank'],
    include_explanations: true
  }
})

console.log(`Generated ${response.data.questions.length} questions`)
```

### Example: Chat with AI Tutor

```typescript
const chatResponse = await apiClient.post('/api/v1/student/chatbot', {
  message: 'Explain the water cycle',
  context: {
    class_id: 'uuid',
    subject: 'Science'
  }
})

console.log(chatResponse.data.response)
```

### Example: Start and Submit Exam

```typescript
// Start exam
await apiClient.post(`/api/v1/student/exams/${examId}/start`)

// Submit answers
const result = await apiClient.post(`/api/v1/student/exams/${examId}/submit`, {
  answers: {
    'q1': 'A',
    'q2': 'B',
    'q3': 'Carbon dioxide and water'
  }
})

console.log(`Score: ${result.data.score}/${result.data.total_points}`)
```

---

## Support & Resources

- **Interactive Documentation**: [Swagger UI](http://localhost:4000/docs)
- **Frontend Client Package**: `@eduator/api-client`
- **Type Definitions**: `@eduator/core`
- **Support Email**: support@eduator.ai

---

**Last Updated**: April 16, 2026  
**Product Version**: 2.1.0
