# Full Codebase Performance Analysis — Improvements Without Losing Security or Quality

Last updated: **Feb 23 2026** (full codebase re-audit + performance estimates)

---

## Status: What's Done

| # | Item | Where | Est. impact |
|---|------|--------|-------------|
| 1.1 | **Batch lesson fetch** | `packages/db/.../lessons.ts`: `getByIds()` for course detail pages. | **N queries → 1.** For a 10-lesson course: ~450ms → ~50ms (saves ~400ms). |
| 1.2 | **Platform owner stats: count-only** | `erp-app/.../platform-owner/users/page.tsx`: 6 parallel count queries. | **No row transfer.** With 1000 profiles: ~800ms → ~120ms (saves ~680ms). |
| 2.1 | **One Supabase client per request** | Platform-owner users, ERP + ERP student/teacher dashboards. | **~30–60ms saved per eliminated client** (cookie parsing + auth init). 3 pages × ~50ms = ~150ms total. |
| 4.1 | **API compression** | `packages/api-server`: `@fastify/compress` registered. | **60–80% smaller JSON payloads.** A 50KB response → ~12KB. Faster on slow connections. |
| 1.3 | **Narrow select in layouts** | All 5 layouts use `getSessionWithProfile()` with `PROFILE_FIELDS_NAV`. | **~40–60% smaller profile payload.** 8 columns instead of ~20+. Saves ~5–15ms per layout render. |
| 2.2 | **getSessionWithProfile()** | `packages/auth/.../server.ts`: one client, one `getUser()`, one narrow query. | **2 round-trips → 1.** Saves ~40–80ms per page that needed user + profile separately. |
| 3.1 | **unstable_cache for public data** | Public courses (60s), org list dropdown (120s). | **DB hit → memory hit for repeat visitors.** ~200ms → ~1ms on cache hit. |
| A3 | **Batch lesson fetch (course run)** | `erp-app/.../courses/[id]/run/page.tsx` uses `getByIdsFull()`. | **N queries → 1.** Same as 1.1: 10 lessons saves ~400ms. |
| A6 | **Parallelize final-exams lookups** | `packages/core/.../final-exams.ts`: `Promise.all` for class/course/profile. | **3 sequential → 3 parallel.** List: ~150ms → ~60ms. Detail: ~120ms → ~50ms. |
| C | **React cache() for getSessionWithProfile** | Deduplicates layout + page profile fetches in same request. | **1 extra DB query eliminated per page.** Saves ~40–60ms on every page with a layout. |
| F3 | **compress: true in next.config.js** | Both `erp-app` and `erp-app`. | **60–80% smaller HTML/JS responses.** Biggest impact on initial page loads and SSR HTML. |
| B1 | **One client — teacher classes [id]** | 10 → 1 client + 1 admin. Parallelized 3 count queries. | **~450ms saved** (9 × ~50ms client init) + count queries parallel saves ~100ms. Total: **~550ms faster.** |
| B2 | **One client — teacher calendar** | 4 → 1 client. Removed debug console.logs. | **~150ms saved** (3 × ~50ms) + log I/O reduction in production. |
| B3 | **One client — student exams [id]** | Both apps: 3 → 1 client per page render. | **~100ms saved** per exam page load (2 × ~50ms). |
| A1 | **Batch org admin fetch** | `erp-app/.../organizations/page.tsx`: single `.in()` query. | **N queries → 1.** With 20 orgs per page: ~900ms → ~50ms (saves ~850ms). |
| A2 | **Batch class stats** | `erp-app/.../school-admin/page.tsx`: 6 counts parallel + batch class stats. | **~20 sequential queries → 8 parallel.** Dashboard: ~1.5s → ~300ms (saves ~1.2s). |
| A4 | **Batch exam submission stats** | Both `teacher/reports/server-utils.ts`: single `.in()` query instead of N+1 per exam. | **N queries → 1.** 20 exams: ~900ms → ~60ms (saves ~840ms). |
| A5 | **Flatten monthly activity loops** | Both `teacher/reports/server-utils.ts`: 6 sequential batches → 1 flat `Promise.all` of 18 queries. | **~300–500ms saved** on reports overview. |
| A7 | **Fix nested await in classes.ts** | `packages/db/.../classes.ts` `getByIdWithStats`: fetch exam IDs first, then parallel. | **~50–100ms saved** per class detail. |
| D1 | **next/dynamic for 5 heavy components** | ExamCreator (4 pages), TeacherCalendarHub (2), StudentAssistantClient (2), AIAgentWidget (1). | **~200–500KB smaller initial bundle.** TTI: ~300–800ms on mobile. |
| D3 | **loading.tsx skeletons** | teacher/student (both apps), school-admin, platform-owner (erp). | **Instant skeleton vs blank.** Better FCP. |
| E1 | **Production log level in agent** | `packages/agent`: logger (debug only in dev). | **~5–20ms per agent call** (no console I/O in prod). |
| E2 | **Schema cache TTL** | `packages/agent/.../schema-loader.ts`: 5 min → 30 min. | **Fewer schema reloads.** ~50ms saved per reload. |
| E6 | **API dashboard parallel** | `api-server/.../teacher/index.ts`: classes + exams + balance in `Promise.all`. | **~100–200ms saved** per dashboard API call. |
| E7 | **API documents parallel** | Same file: list + count in `Promise.all`. | **~40–60ms saved** per documents API call. |
| D2 | **ISR for list/public pages** | teachers (list + [id]), teacher/student courses, student progress/exams/lessons/classes: revalidate 60–120. | **~500ms → ~5ms** on cache hit. |
| E3 | **Narrow select in list methods** | classes, exams, courses, profiles: getByTeacher/getByOrganization use explicit columns. | **~20–40% smaller** list payloads. |
| B5–B14 | **One client per page** | teacher chat, documents, lessons (list + [id]), profile, exams; student courses, lessons [id], exams [id] results; erp org [slug]. | **~50ms per page** (~500ms across 10 pages). |
| F1 | **Token balances parallel** | platform-owner users: token fetch in parallel with stats + orgs. | **~50–100ms** on users page. |
| F8 | **Single exam stats query** | teacher dashboard: one exams query (id, is_published), derive total + published in JS. | **~40ms** (one fewer round-trip). |
| F6 | **getByOrganization limit** | profiles repo: optional limit (cap 5000) to avoid unbounded queries. | **Prevents timeouts** with large orgs. |
| F7 | **getByTeacher limit** | classes repo: optional limit (cap 2000) for teacher classes. | **Same pattern.** |

### Total estimated improvement from completed work

| Area | Estimated saving |
|------|-----------------|
| Teacher reports page (20 exams) | **~1.1–1.3s** (batched submissions + flattened monthly) |
| Teacher classes [id] page | **~550ms** (client reuse + parallel counts) |
| School-admin dashboard | **~1.2s** (batched N+1 + parallel counts) |
| Organizations page (20 orgs) | **~850ms** (batched admin fetch) |
| Course run page (10 lessons) | **~400ms** (batched lesson fetch) |
| Platform-owner users page | **~680ms** (count-only stats) |
| Every page with layout | **~40–60ms** (React cache dedup) |
| All API responses | **60–80% smaller** (compression) |
| Public pages (repeat visits) | **~200ms → ~1ms** (unstable_cache) |
| Initial JS (heavy routes) | **Smaller chunks** (dynamic imports) + **skeletons** (loading.tsx) |
| Agent / API teacher routes | **Less I/O in prod** (logger) + **parallel dashboard/documents** (~150–260ms per call) |
| List/public pages (ISR) | **~500ms → ~5ms** on cache hit; **smaller list payloads** (explicit columns) |

---

## Remaining Work (full codebase audit)

### B. Multiple Supabase clients per page — HIGH priority ~~(remaining)~~ **Done**

| # | File | Fix | Est. impact |
|---|------|-----|-------------|
| B5 | `teacher/chat/page.tsx` | One client, pass to getTeacherInfo + getTeacherDocuments | ~50ms |
| B6 | `teacher/documents/page.tsx` | One client, pass to getTeacherInfo + getDocuments | ~50ms |
| B7 | `teacher/lessons/[id]/page.tsx` | One client, pass to getTeacherInfo + getLesson | ~50ms |
| B8 | `student/lessons/[id]/page.tsx` | One client, pass to getStudentId + getStudentLessonDetail/Progress | ~50ms |
| B9 | `student/courses/page.tsx` | One client + one admin, pass to getStudentId + getEnrolledCourses | ~50ms |
| B10 | `teacher/exams/page.tsx` | One client, pass to getTeacherInfo (exams/stats/classes already used it) | ~50ms |
| B11 | `teacher/lessons/page.tsx` | One client, pass to getTeacherInfo | ~50ms |
| B12 | `teacher/profile/page.tsx` | One client, pass to getTeacherProfile + getContactRequests | ~50ms |
| B13 | `student/exams/[id]/results/page.tsx` | One client, pass to getStudentId + getStudentExamResults | ~50ms |
| B14 | `erp-app/.../org/[slug]/page.tsx` | One client, pass to getOrganizationBySlug + getOrganizationPublicStats | ~50ms |

**Total B5–B14:** ~500ms across 10 pages. Completed.

### C. Layout + page profile duplication — MEDIUM priority

Already fixed via React `cache()` on `getSessionWithProfile`. Mark as done.

### D. Client-side / bundles — MEDIUM priority

| # | Issue | Details | Est. impact |
|---|-------|---------|-------------|
| D1 | ~~No `next/dynamic`~~ **Done** | Lazy-load: ExamCreator, TeacherCalendarHub, StudentAssistantClient, AIAgentWidget. | **~200–500KB smaller initial JS.** TTI: ~300–800ms on mobile. |
| D2 | ~~19× force-dynamic~~ **Done** | Teachers dir, teacher/student courses, student lists → revalidate 60–120. | **~500ms → ~5ms** on cache hit. |
| D3 | ~~No `loading.tsx`~~ **Done** | teacher/student/school-admin/platform-owner loading.tsx added. | **Instant skeleton vs blank.** Better FCP. |
| D4 | **No list virtualization** | Documents, users, classes render all rows. | **DOM nodes:** 200 rows → ~20 visible. Scroll jank eliminated. ~100–300ms render saving for large lists. |
| D5 | **No `React.memo`** | exam-creator, lesson-content, calendar-hub, documents-explorer. | **~10–50ms per avoided re-render.** Most visible in calendar drag-and-drop and exam editing. |

### E. Packages — MEDIUM priority

| # | Package | Issue | Fix | Est. impact |
|---|---------|-------|-----|-------------|
| E1 | ~~`packages/agent`~~ **Done** | Logger: debug only in dev. | **~5–20ms per agent call** (no console I/O in prod). |
| E2 | ~~Schema cache~~ **Done** | TTL 5 min → 30 min in schema-loader. | **Fewer schema reloads.** |
| E3 | ~~`packages/db` list methods~~ **Done** | Explicit columns in getByTeacher / getByOrganization. | **~20–40% smaller** list payloads. |
| E4 | `packages/ai` | No caching for repeated AI generations | Cache by doc-hash + settings-hash | **~3–15s saved per duplicate generation** (biggest single-item saving, but less frequent). |
| E5 | `packages/db/.../lessons.ts` | `getByIdForStudent`: 2 sequential queries | Single query with EXISTS/JOIN | **~40–60ms saved** per student lesson view. |
| E6 | ~~API dashboard~~ **Done** | classes + exams + balance in `Promise.all`. | **~100–200ms saved** per dashboard call. |
| E7 | ~~API documents~~ **Done** | list + count in `Promise.all`. | **~40–60ms saved** per documents call. |
| D2 | ~~force-dynamic → ISR~~ **Done** | teachers (list + [id]), teacher/student courses, student progress/exams/lessons/classes → revalidate 60–120. | **~500ms → ~5ms** on cache hit for public/list pages. |
| E3 | ~~select('*') in list methods~~ **Done** | classes.getByTeacher, exams.getByTeacher, courses.getByTeacher, profiles.getByOrganization → explicit columns. | **~20–40% smaller** list payloads. |

### F. Nice to have — LOW priority

| # | Issue | Details | Est. impact |
|---|-------|---------|-------------|
| F1 | ~~Token balances sequential~~ **Done** | Platform-owner users: token fetch in parallel with stats + orgs. | **~50–100ms.** |
| F2 | `React.memo` | exam-creator, lesson-content, calendar-hub, documents-explorer | **~10–50ms per avoided re-render.** |
| F4 | AI retry logic | Embedding API failures | **Reliability:** avoids failed embeddings. |
| F5 | Middleware DB query every request | Profile needed for role/approval; skip only on public routes (already done). | Deferred: caching profile has security tradeoffs. |
| F6 | ~~getByOrganization pagination~~ **Done** | Optional `limit` (cap 5000) in profiles repo. | **Prevents unbounded queries.** |
| F7 | ~~getByTeacher pagination~~ **Done** | Optional `limit` (cap 2000) in classes repo. | **Same pattern.** |
| F8 | ~~Duplicate teacher stats~~ **Done** | One exams query, derive total + published in JS. | **~40ms** per dashboard. |

---

## Impact summary

### Completed improvements: estimated total

| Metric | Estimate |
|--------|----------|
| Worst-case page (school-admin dashboard) | **~1.2s faster** |
| Worst-case page (organizations with 20 orgs) | **~850ms faster** |
| Avg. page with layout (React cache dedup) | **~50ms faster** |
| API JSON responses | **60–80% smaller** |
| Public pages (cache hit) | **~200ms → ~1ms** |

### Remaining improvements: estimated total if all implemented

| Metric | Estimate |
|--------|----------|
| Teacher reports page (A4 + A5) | **~1.1–1.3s faster** |
| 10 pages with 2× client (B5–B14) | **~50ms each = ~500ms across all** |
| Initial JS bundle (D1 dynamic imports) | **~200–500KB smaller → 300–800ms faster TTI on mobile** |
| Perceived load time (D3 loading.tsx) | **Instant skeleton vs blank screen** |
| ISR pages (D2, 19 pages) | **~500ms → ~5ms on cache hit** |
| AI duplicate generation (E4) | **~3–15s saved per repeat** |
| Middleware optimization (F5) | **~30–50ms saved on EVERY request** |

---

## Suggested implementation order (next)

### Phase 7 — Everything else

1. ~~**B5–B14**~~ **Done** — One client per page (10 pages, ~500ms total)
2. ~~**F1**~~ **Done** — Token balances parallel (platform-owner users)
3. ~~**F8**~~ **Done** — Single exam stats query (teacher dashboard)
4. ~~**F6, F7**~~ **Done** — Optional limit on getByOrganization / getByTeacher
5. **D4** — List virtualization (documents, users, classes) — larger UX change
6. **E4** — AI generation caching (~3–15s per repeat)
7. **E5** — getByIdForStudent single query (would need DB RPC or raw SQL)
8. **Remaining:** F2 React.memo, F4 AI retry, F5 middleware (deferred)

---

**Completed: Phases 1–6 + B5–B14 + F1, F6, F7, F8 (42 items). Remaining: D4, E4, E5, F2, F4, F5 (optional).**
