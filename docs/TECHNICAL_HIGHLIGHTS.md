# Eduator AI — Technical Highlights

**Audience:** Technical evaluators, architects, integration leads.  
**Focus:** What matters for adoption, security, scalability, and integration — not basic feature lists.

---

## 1. Architecture & Stack

### 1.1 Monorepo & Packages

| Layer | Choice | Why it matters |
|-------|--------|-----------------|
| **Monorepo** | Turborepo | Single repo, shared packages (`@eduator/ai`, `@eduator/agent`, `@eduator/db`), consistent builds and versioning across ERP, SAAS, and API. |
| **API** | Fastify 4.x | High throughput, low overhead, OpenAPI 3.0 at `/docs`, structured logging, rate limiting. |
| **Database** | Supabase (PostgreSQL 15) | Managed Postgres, RLS for multi-tenant isolation, optional real-time, storage buckets (documents, lesson-images, lesson-audio). |
| **AI** | Google Gemini 2.x, Imagen 3, TTS | Single provider for text, images, speech; consistent API; RAG via `text-embedding-004`. |

**Apps:** ERP (admins/teachers) on Next.js 15, SAAS (students) on Next.js 15, API server (Fastify) — separate deploy targets; all consume shared `@eduator/*` packages.

### 1.2 Package Responsibilities

| Package | Responsibility |
|---------|----------------|
| `@eduator/config` | Environment, constants, AI model names (Gemini, Imagen, TTS). |
| `@eduator/core` | TypeScript types, Zod validation, Zustand stores, shared hooks. |
| `@eduator/auth` | Supabase auth (client/server/admin); JWT handling. |
| `@eduator/db` | Database repositories; all queries go through this layer. |
| `@eduator/ai` | Exam/lesson/course generation, TTS, translations, RAG, EduBot chat. |
| `@eduator/agent` | Universal AI Agent: ReAct flow, SQL execution, action tools, reflection/critic. |
| `@eduator/ui` | Shared React components (Smart Calendar Hub, dialogs, forms, tables). |
| `@eduator/api-client` | HTTP client + React Query hooks for frontends. |
| `@eduator/api-server` | Fastify REST API; JWT validation, RBAC, OpenAPI. |

Frontends (ERP, SAAS) never talk to Supabase or AI directly for business logic — they call the API server, which uses `@eduator/db`, `@eduator/ai`, and `@eduator/agent`. This keeps a single place for security, rate limits, and observability.

---

## 2. Multi-Tenant & Security

### 2.1 Row-Level Security (RLS)

- **All tenant tables** enforce RLS. Users see only their organization’s data; teachers only their own content (documents, exams, lessons, courses).
- **Agent SQL execution:** Every SELECT run by the agent is executed in a context where RLS applies. For Platform Owner, no extra filter; for School Admin, `organization_id` is enforced so they cannot see other organizations’ rows.
- **No bypass:** The API uses the authenticated user’s Supabase client (or service role only where explicitly required); there is no “superuser” query path that ignores RLS for tenant data.

### 2.2 Authentication & Authorization

- **JWT via Supabase Auth** — no custom auth implementation. Tokens are created and refreshed by Supabase; the API validates the JWT on each request and derives role from the profile.
- **RBAC:** Routes and handlers check `profile.type` (platform_owner, school_superadmin, teacher, student). Unauthorized access returns 403 with a clear error code.
- **Token in header:** `Authorization: Bearer <jwt>`. Swagger UI at `/docs` supports token input for testing.

### 2.3 Agent SQL Safety

- **SELECT-only:** The agent never executes INSERT/UPDATE/DELETE/DDL. Administrative actions (create user, class, organization) are implemented as fixed tools with validated parameters, not free-form SQL.
- **Word-boundary checks:** Blocked keywords (e.g. CREATE, DROP, INSERT) are detected with word boundaries so column names like `created_by` do not trigger a false positive.
- **Parameterized execution:** SQL is executed via Supabase with parameterized values; there is no string concatenation of user input into SQL.
- **Critic step:** Before execution, SQL can be validated (and optionally reviewed by the LLM) to catch schema or logic issues; on failure, a reflection/retry loop (up to 3 attempts) feeds the error back to the LLM for corrected SQL.

### 2.4 File Storage

| Bucket | Visibility | Purpose |
|--------|------------|---------|
| `documents` | Private | Teacher uploads (PDF, MD, TXT); used for RAG and generation; access via signed URLs or server-side only. |
| `lesson-images` | Public (CDN-friendly) | AI-generated lesson images; access controlled by app (who can see the lesson). |
| `lesson-audio` | Public (CDN-friendly) | TTS-generated narration; same access model as lesson content. |
| `exam-images` | As needed | Exam-related images if used. |

Only the API and server-side code create signed URLs or serve asset paths; the frontend never gets raw storage keys for private buckets.

---

## 3. AI & Agent System (Differentiators)

### 3.1 Universal AI Agent (`@eduator/agent`)

**ReAct pattern with agentic improvements:**

- **Reflection/retry loop:** On SQL execution failure, the error (and optionally the failing SQL) is fed back to the LLM, which produces corrected SQL. Up to 3 retries with full error history so the model can fix schema or naming mistakes.
- **Critic/review step:** Before execution, SQL is validated (syntax and safety checks; optional LLM review) to catch schema, safety, and logic issues.
- **Schema-awareness:** Database schema (DDL) is injected into prompts so the model knows table and column names. An optional dynamic schema loader fetches and validates tables from the live database (with fallback to static schema).
- **“Think first” SQL generation:** The agent analyzes the question (synonyms, intent, filters) before generating SQL so that semantically equivalent questions (“Show all teachers”, “List teachers”) yield consistent, correct SQL.
- **Business rules in tools:** Tool definitions include **BUSINESS RULES** in their descriptions (e.g. required fields, valid roles, organization scope) so the LLM respects constraints when planning multi-step actions.

**Two modes:**

- **Think Mode:** Read-only. Only SELECT queries; all write/action requests are blocked with a user-friendly message directing the user to Agent Mode.
- **Agent Mode:** Full CRUD for admin operations. Same inquiry path as Think Mode, plus execution of action tools (create_user, create_class, create_organization, etc.) with real-time progress tracking (pending → executing → completed/failed per step).

**Data flow (simplified):**

```
User message (text or audio)
  → Intent classification (inquiry vs action)
  → Inquiry: Think → Generate SQL → Critic → Execute (or Reflect/Retry) → Format
  → Action: Build progress list → Execute tools sequentially → Update progress → Format
  → Formatted response (tables, success/failure, progress)
```

**Audio input:** Voice is transcribed via Google Cloud Speech-to-Text (with automatic language detection); the resulting text is then processed through the same intent classification and execution pipeline.

**Security summary:** SELECT-only for database; administrative changes only via fixed, parameter-validated tools; RLS and user context applied to every execution.

### 3.2 RAG & Content Pipeline

**Document pipeline:**

1. Upload: PDF/MD/TXT stored in `documents` bucket.
2. Extraction: Text extracted (e.g. PDF parsed to text).
3. Embedding: Chunks embedded with `text-embedding-004` and stored (e.g. in Supabase or your vector store).
4. Retrieval: At generation or chat time, relevant chunks are retrieved by similarity and passed to the LLM as context.

This pipeline feeds: **exam generation**, **lesson generation**, **course generation**, **teacher EduBot** (teaching assistant), and **student EduBot** (tutor). So all of these features are grounded in your documents, not generic knowledge only.

**Lesson generation (standalone):** Single- or multi-document RAG; optional **manual learning objectives** (teacher-provided text — AI structures the lesson around them); optional **grade level** (`grade_1`–`grade_12`, `undergraduate`, `graduate`, `phd`) so the AI tailors vocabulary and complexity; 2-letter language codes; rich content options (images, audio, tables, figures). See [API.md](./API.md) for request body and Next.js app route vs REST server.

**Course generation (AI Curriculum Architect):**

- **Input:** Documents, number of lessons, difficulty, style, language, optional course topic, optional lesson topics, exam settings (question count, types, difficulty).
- **Process:** Agentic flow — analyze documents → produce blueprint (lesson order, titles) → generate lessons sequentially (with RAG) → generate final exam → background TTS for all lessons. Optional lesson topics constrain what each lesson covers.
- **Output:** A course entity with ordered lessons, each with HTML, images, and audio; plus a final exam. All stored and linkable from the teacher’s course run UI (Coursera/Udemy-style player).

**Multi-model orchestration:** Text and structure (Gemini), images (Imagen 3 / 2.5 Flash), narration (Gemini TTS) are orchestrated inside `@eduator/ai`; the API exposes high-level operations (e.g. “generate lesson”, “generate course”) so callers do not manage models directly.

---

## 4. API & Integration

### 4.1 REST & OpenAPI

- **Base path:** `/api/v1`. Versioning is URL-based; future versions can be `/api/v2` without breaking v1.
- **Documentation:** OpenAPI 3.0 served at `/docs` (Swagger UI). Includes request/response schemas, auth (Bearer token), and try-it-out.
- **Response shape:** Success: `{ success: true, data, message? }`. Error: `{ success: false, error: { code, message, details? } }`.
- **Pagination:** List endpoints return `{ items, pagination: { page, per_page, total, total_pages } }` where applicable.

### 4.2 Error Handling & Rate Limiting

**HTTP status codes:** 200/201 success; 400 validation; 401 unauthorized; 403 forbidden; 404 not found; 409 conflict; 429 rate limit; 500 server error.

**Common error codes:** `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `ALREADY_EXISTS`, `CREATE_FAILED`, `UPDATE_FAILED`, `DELETE_FAILED`.

**Rate limiting:** Configurable (e.g. 100 req/min per IP). Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. 429 when exceeded.

### 4.3 Integration Options

1. **REST API:** Call Fastify endpoints with JWT. Use `/docs` for discovery and testing. All role-scoped operations (platform owner, school admin, teacher, student) are available via documented endpoints.
2. **Direct Supabase:** Connect to the same Supabase project with your own client. RLS still applies; you must respect the same tenant and role model. Useful for read-only reporting or custom jobs that run in a trusted context.
3. **Package import:** Use `@eduator/ai` (and optionally `@eduator/agent`) inside your own Node service if you want to reuse AI/agent logic without going through the REST API (e.g. internal tools or batch pipelines). You still need to supply Supabase and Google AI credentials and enforce your own security.

---

## 5. Data Model Highlights

### 5.1 Core Entities

- **organizations:** Tenants (schools, universities). Have type, subscription plan, status, contact info.
- **profiles:** Users; linked to organization (except platform owners). Fields include role (`platform_owner`, `school_superadmin`, `teacher`, `student`), approval status, and metadata.
- **classes:** Class groups within an organization. Have primary teacher (`teacher_id`), optional class code for student join.
- **class_teachers:** Many-to-many: which teachers are assigned to which classes (no primary/assistant distinction in current model).
- **Enrollments:** Which students are in which classes (separate table or equivalent).

### 5.2 Content Entities

- **documents:** Uploaded files (PDF, MD, TXT); linked to teacher; used for RAG and generation.
- **exams:** AI-generated or manual; have questions, translations, difficulty; can have `start_time`/`end_time` for calendar.
- **lessons:** AI-generated or manual; HTML, images, audio; can have `start_time`/`end_time` for calendar.
- **courses:** Multi-lesson units; ordered list of lessons + final exam; course run tracks progress (e.g. time per lesson).
- **Chat / teacher_chat:** EduBot conversations (teacher assistant, student tutor); can be assigned to a class so students see teacher’s conversation.

### 5.3 Calendar

- **Smart Calendar Hub** (teacher UI) consumes lessons and exams that have `start_time` and `end_time` (TIMESTAMP WITH TIME ZONE).
- Teachers drag drafts from a sidebar onto calendar slots and assign a class; they can reschedule by dragging events. Live status (e.g. “18/25 students”) can be shown per event when enrollment and activity data are available.

---

## 6. Scalability & Operations

### 6.1 Horizontal Scaling

- **API server:** Stateless. Run multiple instances behind a load balancer; no in-memory session state. JWT validation and DB/AI calls are per-request.
- **Frontends:** ERP and SAAS are static/SSR; can be deployed to CDN + serverless (e.g. Vercel) and scale with traffic.

### 6.2 Background & Long-Running Work

- **TTS:** Audio for lessons (and courses) can be generated in the background so the HTTP response returns quickly; the client can poll or be notified when audio is ready.
- **Course generation:** Long-running multi-step generation (blueprint → lessons → exam → TTS) is designed to run asynchronously so that timeouts and load are manageable. Progress can be exposed via API or UI.

### 6.3 Configuration & Observability

- **Config:** Centralized in `@eduator/config`. AI model names, feature flags, and non-secret settings live here; secrets (Supabase URL/keys, Google AI key) come from environment variables.
- **Logging:** API server uses structured logging. Agent and AI layers can be instrumented so that errors, latency, and usage are observable in your preferred logging/monitoring stack.
- **Health:** `GET /health` and `GET /ready` support load balancers and orchestrators; `GET /api/v1` returns API name and version.

---

## 7. Key Technical Docs

| Doc | Content |
|-----|---------|
| `docs/agent/ARCHITECTURE.md` | Agent ReAct flow, Think vs Agent, reflection, critic, schema, security, data flow, STT. |
| `docs/agent/API_REFERENCE.md` | Agent API and usage. |
| `docs/agent/MODES.md` | Think Mode vs Agent Mode behavior. |
| `docs/agent/POSSIBLE_QUESTIONS.md` | 200+ example queries for admins. |
| `docs/API.md` | Full REST API; auth, roles, errors, rate limits, examples. |
| `docs/TECHNICAL.md` | Stack, DB, AI features, file storage, packages, calendar. |
| `packages/agent/docs/AGENTIC_IMPROVEMENTS.md` | Implementation details for reflection, critic, schema. |

---

## 8. Reporting Intelligence (April 2026)

### 8.1 Teacher Reporting Architecture Upgrade

- Reporting evolved from a static page into a filter-driven analytics workspace with URL-synced state and tab-specific fetch behavior.
- Aggregation service now supports normalized filter input (`tab`, `classId`, `startDate`, `endDate`) and period-over-period comparisons.
- Report IA was streamlined to four high-signal tabs (`overview`, `exams`, `lessons`, `classes`) after removing low-value aggregate surfaces.
- Insight engine returns actionable recommendations (including deep-link metadata) instead of only summary metrics.

### 8.2 Drilldown and Workflow Continuity

- Dedicated drilldown routes:
  - class: `/teacher/reports/classes/[id]`
  - student: `/teacher/reports/students/[id]`
- Class operations now connect directly to analytics (class reporting cards, students tab actions, enrolled student quick report links).
- Result: lower navigation friction from class management to intervention analytics.

### 8.3 Data Foundation for Long-Range Analytics

- Added `activity_events` table design for explicit engagement events.
- Added `reporting_snapshots_mv` materialized view for daily teacher/class snapshots.
- Enables faster future expansion into attendance/on-time/late completion and cohort trend analysis without redesigning APIs.

### 8.4 Stability and Visualization Hardening

- Activity trend analytics now use adaptive bucket generation (daily/weekly/monthly by selected period) instead of fixed monthly-only windows.
- Shared line-chart rendering was rewired with viewBox-based plotting and adaptive label density to prevent squashed points and unreadable axes.
- Error boundary payloads were sanitized before UI boundary rendering to avoid Next.js 15 formatter/runtime crashes triggered by non-standard error frames.

---

*This document emphasizes architecture, security, AI/agent design, and integration. For full feature lists see [FEATURES.md](./FEATURES.md); for product direction see [ROADMAP.md](./ROADMAP.md).*

**Document applies to:** v0.11.0.
