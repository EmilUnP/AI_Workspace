# Eduator AI v2.1 - Features Documentation

## Version 2.1.0 - Current Release

This document describes features currently available in Eduator AI. Each feature is listed under the version where it was introduced, so there is no duplication across versions.

---

### Added in 2.1.0 (April 2026)

#### Teacher reporting intelligence and drilldown workflow (ERP)
- **Full reporting workspace upgrade**: `/teacher/reports` now supports explicit start/end date filtering (default: this month), class filtering, URL-synced state, and richer tab behavior.
- **Cleaner report information architecture**: Reports now use four focused tabs (`overview`, `exams`, `lessons`, `classes`) after removing the low-value students aggregate tab.
- **Class and student drilldowns**: Dedicated deep analytics pages for class-level and student-level performance, trend, and timeline context.
- **Actionable reporting**: Metric deltas and recommendation-style insights support faster teacher decision making.
- **Class operations to analytics continuity**: Student/report links are now embedded across class reporting and class students workflows, reducing clicks from management to intervention.
- **Reporting UX refresh**: Main reports, all report tabs, class drilldown, and student drilldown pages upgraded for cleaner hierarchy and higher-value readability.

---

### Operational Updates (April 2026, post-1.0.5)

#### Teacher reporting and class intelligence upgrade (ERP)
- **Filter-driven reporting workspace**: `/teacher/reports` now supports custom period selection (`startDate`, `endDate`) with "this month" default plus class filter and URL-synced state.
- **Actionable analytics**: Report cards now include period-over-period deltas and insight actions for faster teacher decisions.
- **Class and student drilldowns**: New teacher drilldown pages for class-level and student-level analytics:
  - `/teacher/reports/classes/[id]`
  - `/teacher/reports/students/[id]`
- **Class page analytics integration**: `/teacher/classes/[id]` now links directly into report drilldowns from reporting and students workflows.
- **Students tab UX upgrade**: Enrolled student cards now include direct “Report” navigation and click-through profile area to contextual student reporting.
- **Reporting UX stability improvements**: Activity Trend now uses adaptive time buckets and revised chart rendering for reliable period switching and clearer point/label layout.
- **Reporting data foundation**: Added SQL foundation for activity events and snapshot materialized views in `apps/erp-app/src/app/teacher/reports/reporting-activity-foundation.sql`.

---

### Added in 1.0.5 (March 2026)

#### Final exam randomized pool mode (ERP + ERP)
- **Two final exam strategies**: Added `fixed_selection` and `random_pool` modes for final exams.
- **Pool + attempt limit**: Teachers/admins can select a large question pool and set `questions per attempt` (e.g. pool 100, deliver 30).
- **Per-student randomized subset**: Each student receives a randomized non-duplicate set from the pool.

#### Final exam authoring and visibility UX
- **Select all/unselect all toggle**: Question selection controls now support toggling all questions on/off in one action.
- **Mode visibility in list/detail**: Final exam list and detail pages now display Question mode and Questions per attempt.
- **Post-generation exam title editing**: Exam creator now allows title editing after AI-generated questions.

#### Student take/score/results consistency
- **Subset-aware delivery**: Student exam detail only shows the effective final-exam subset.
- **Subset-aware scoring/results**: Submission scoring and results now evaluate the same delivered subset, including random-pool mode.

---

### Added in 1.0.4 (March 2026)

#### AI writing quality and prompt engineering hardening
- **Cross-service quality rules**: Strengthened prompts in lesson/exam/question/course/education-plan/chatbot pipelines for a direct, professional educational tone.
- **Anti-filler language controls**: Added explicit constraints against low-value source-referencing lead-ins (for example, "According to the text..." style intros) across supported languages.
- **Explanation cleanup guardrails**: Expanded explanation post-processing/sanitization so generated mini-test and exam explanations stay concise, student-facing, and practical.

#### Documentation and roadmap quality pass
- **Release documentation sync**: README, API docs, changelog, and roadmap were aligned to the latest release.
- **Future plan refresh**: Replaced outdated roadmap future sections with more actionable near-term milestones.

---

### Added in 1.0.3 (March 2026)

#### Exam generation and final exam configuration quality upgrade (ERP + ERP)
- **Stricter exam generation behavior**: Topic parsing/handling is more robust and per-topic question expectations are enforced more reliably after generation.
- **Cleaner exam planning UX**: Question type and difficulty planning now use clear percentage-based controls with live count previews and auto-balancing behavior.
- **Course final exam settings refresh**: Step 3 final exam options in course creation were redesigned to align with exam-generation UX (compact summaries, cleaner controls, better readability).
- **Space-saving option toggles**: Lesson generation options and final exam settings are now collapsible, reducing vertical clutter while preserving quick status visibility.

#### Lesson content rendering reliability
- **Mermaid diagram support**: Lesson content renderer now handles Mermaid blocks directly in generated lesson output.
- **Diagram repair pipeline**: Added preprocessing/normalization for common malformed Mermaid output patterns from AI generation, reducing diagram render failures in real lessons.

#### Slider visual consistency (exam + course flows)
- **Unified slider appearance**: Replaced inconsistent native slider visuals with a consistent filled-track + thumb style across course-create and exam-creator interfaces.

---

### Added in 0.18.0 (March 2026)

#### Student profile full i18n (ERP + ERP)
- **Student exams**: Exams list, take-exam page, and results page fully translated (English, Azerbaijani, Russian). Final exam description and question type labels (e.g. multiple choice, true/false) follow the selected language. “Back to My Courses” when opening an exam from a course run.
- **Student classes**: Classes list and class detail page fully translated in both apps.
- **Student calendar**: Calendar page labels, sections (available now, upcoming, past), and empty-state hints translated.
- **My Courses (ERP)**: Courses list, join flow, progress labels, certificate view, and course run (lessons, content tabs, final exam) fully translated. Course run uses student-specific message namespaces so all strings follow the student locale.
- **Study assistant (FAB + panel)**: The floating study-assistant button and the full panel (Today, Exams, Lessons, Updates, Progress tabs; today activity; upcoming exams; lessons; class updates; progress & achievements; “Ask me anything” chat) are fully translated. Button tooltip and accessibility label update with the current language. Template messages (e.g. “X completed today”) use the correct locale without errors.

---

### Added in 0.17.30 (March 2026)

#### Student join by code + teacher confirmation (ERP)
- **Join by code → pending**: Students enter the class code and get “pending” until the teacher confirms. Student sees “Pending approval” and “Request sent. You will have access once the teacher approves.”
- **Teacher: Pending join requests**: Class detail shows students who joined by code; teacher can **Confirm** or **Reject** each. No “Add students” dialog; enrollment is confirm-only.
- **Remove student**: Teacher can remove an enrolled student from the class via a Remove button next to each student in the Enrolled Students section.
- **DB**: Run the migration in `supabase/migrations/` to allow `status = 'pending'` on `class_enrollments` (see Supabase README).

---

### Added in 0.17.26 (March 2026)

#### Teacher calendar: weekly navigation and usability
- **Weekly navigation**: Previous/Next week and Today work; calendar shows the selected week. Header shows “Today” only when the displayed week is the current week.
- **Final exams on calendar**: Scheduled final exams (from Final Exams) appear on the teacher calendar with distinct amber color; legend shows Exam (violet), Final exam (amber), Lesson (emerald).
- **Confirm & publish week**: One-click action in the top bar to confirm/publish all draft events for the viewed week.
- **Unpublish**: Quick Edit Panel offers “Unpublish (revert to draft)” for published events. UI refreshes automatically after schedule, update, delete, confirm week, or unpublish.

#### Teacher calendar UX changes
- **Confirm week button**: Moved from calendar card header to main page top bar (next to AI Pulse).
- **Quick Stats removed**: Exams/Lessons/Classes count block removed from calendar top bar.
- **Per-event Confirm & publish removed**: Publishing is done only via “Confirm & publish week” in the top bar.

---

### Added in 0.17.25 (February 2026)

#### Teacher calendar full i18n (ERP + ERP)
- **Calendar Hub**: All labels translated (title, scheduled/drafts, class filter, stats, AI Active, schedule material dialog). Materials Library sidebar: header, filters, search, empty states, drag hint. Quick Edit Panel: Edit Event, form labels, Confirm & publish, Save, Delete. SmartCalendar: day names, Previous/Next week, Today, view toggle, event types, event count, Unused tooltip.
- **Message namespace**: `teacherCalendar` in both apps (en, az, ru). Server pages pass label objects to hub; “Unknown Class” fallback translated.

#### Teacher classes full i18n (ERP + ERP)
- **List, create, detail**: Copy class code, Share Exam/Document/Lesson dialogs and modals, Shared content list, Enroll students modal (filters, search, empty states), AI Tutor section (title, descriptions, Open Chat, Link Existing Chat modal). All via `teacherClasses` namespace and label props to shared UI components.

#### Education plans i18n and audience (ERP + ERP)
- **Create / detail / edit**: Form sections, placeholders, audience selector dropdown, week title placeholder. Full translation of plan content and labels.

#### Calendar drafts sidebar UX
- **Removed status badge**: “✓ Live” / “○ Unused” badge removed from each draft item in the Materials Library; items show title, question count, and duration only.

---

### Added in 0.17.16 (February 2026)

#### Path-based i18n message splitting (ERP + ERP)
- **Module mapping**: Pathname → message module (public | teacher | student; ERP also platform-owner | school-admin). Messages loaded only for the current route for smaller bundles.
- **Split message folders**: `messages/public/`, `messages/teacher/`, `messages/student/` (ERP); ERP adds `messages/platform-owner/`, `messages/school-admin/`. Each has en.json, az.json, ru.json. No root-level locale files.
- **Middleware**: Both apps set request header `x-pathname`; `i18n/request.ts` uses it for path-based dynamic imports and merges public messages when loading teacher/student/admin modules.
- **Cleanup**: Root en/az/ru.json and split scripts removed; translations edited directly in the module folders. ERP has no admin module (admin roles use ERP).

---

### Fixed in 0.17.11 (February 2026)

#### i18n formatting and duplicate-key fixes
- **Duplicate `teacherProfile` key (ERP)**: Second namespace renamed to `teacherProfilePage`; profile page and tabs use it.
- **Documents**: `explorerBrowseToUpload` now receives `{ browse }` from `uploadBrowseLabel`; delete confirm uses `#TITLE#` placeholder and runtime replace in edit-dialog.
- **Teacher dashboard**: All numeric placeholders use `#N#` instead of ICU `{n}` in messages; `plural()` and date-format helpers replace `#N#` at runtime in both apps (en/az/ru).

---

### Added in 0.17.10 (February 2026)

#### Full teacher panel internationalization (i18n Phase 2)
- **Teacher navigation translated**: All sidebar items (Dashboard, Teaching Studio, Documents, Exams, Lessons, Courses, AI Tutor, Calendar, Classes, Education Plans, Reports, Tokens, Settings, API Integration) use `next-intl` server translations in ERP and ERP.
- **Teacher pages translated**: Courses (list + create wizard), Lessons (list + generate), Exams (list + create), Final Exams, Documents, Education Plans, Tokens, Chat / AI Tutor, Teaching Studio, Settings, and Profile — all now use `useTranslations()` with namespaced keys in both apps.
- **Student pages translated**: Student layout and settings page.
- **Shared UI i18n**: New `TeacherSettingsTranslations` interface (35+ keys) in `@eduator/ui`; `TeacherSettingsClient` and `TeachingStudioHub` accept translated labels as props with English defaults.
- **Grade levels, question types, difficulty labels, and transaction types**: All rendered from translation keys instead of hardcoded English strings.
- **2500+ new translation lines**: 400+ keys added per language file (az/en/ru) in both ERP and ERP message files.
- **End-to-end coverage**: Combined with v0.17.5 (public pages), the entire application is now fully translatable in English, Azerbaijani, and Russian.

---

### Added in 0.17.9 (February 2026)

#### Optimized RAG embeddings for large documents
- **Reduced embedding dimensions**: Embedding vectors reduced from 3072 → 768 dimensions using Google's recommended Matryoshka Representation Learning (MRL) via `outputDimensionality` parameter. Quality preserved per Google's guidance (768 is the recommended minimum with minimal quality loss).
- **Larger chunk size**: Text chunks increased from 2500 → 4000 characters with 400-char overlap, reducing chunk count by ~37% while retaining more context per chunk.
- **Batch embedding API**: Uses Gemini `batchEmbedContents` REST endpoint (100 texts per request) instead of the old SDK call (5 per batch), reducing API round trips from ~134 to ~5 for 1.5M-char documents.
- **Direct REST API calls**: Replaced deprecated `@google/generative-ai` SDK with direct `fetch()` to Gemini REST API, enabling `outputDimensionality` control.
- **Fallback embeddings table**: New `document_chunk_embeddings` table stores one row per chunk when the main JSONB column exceeds PostgreSQL size/timeout limits. Includes retry logic (3 attempts, 2s delay) for transient Supabase/Cloudflare 520/521 errors.
- **Centralized config**: `EMBEDDING_DIMENSIONS: 768` added to `AI_MODELS` constant for single-point tuning.

#### Auth resilience during Supabase outages
- **Graceful session handling**: Middleware, server auth helpers, and login actions catch `TypeError: Cannot create property 'user' on string` (caused by Supabase returning HTML instead of JSON during outages) and degrade gracefully instead of crashing the app or logging users out.
- **Normalized error logging**: Supabase 520/521 HTML error responses are converted to short, readable messages instead of dumping full HTML into logs.

---

### Added in 0.17.7 (February 2026)

#### Turborepo & Vercel deployment
- **Turborepo**: Monorepo uses Turborepo for build and dev; `turbo run build` and `turbo run build --filter=<app>` so only the target app and its dependencies are built. Enables caching and per-app deploys.
- **Per-app Vercel builds**: Each app (ERP, ERP, API) has `vercel.json` with Turbo filter; optional **Ignored Build Step** (`npx turbo-ignore`) so each project only builds when that app or its deps changed.
- **Next.js 15 compatibility**: Client wrappers for `StudentAssistantClient` and `ExamCreator` (ERP and ERP) so `next/dynamic` with `ssr: false` is used only in Client Components, fixing Server Component build errors on Vercel.
- **word-extractor types**: `@types/word-extractor` added to `@eduator/ai` for TypeScript build on Vercel.

---

### Added in 0.17.5 (February 2026)

#### Multi-language support (Azerbaijani, Russian, English)
- **Language switcher**: Dropdown with country flag images in both ERP and ERP navbars (before and after login). Users can switch between English, Azerbaijani, and Russian; preference saved via cookie.
- **ERP public pages translated**: Landing, About, Services, Pricing, Login, Sign Up, Forgot Password, Find Teachers, Teacher Profile (contact form, ratings), Find Courses (with flag-enabled filter dropdowns), Course Details (stats, rating, join/start actions).
- **ERP public pages translated**: Landing, About, Services, Pricing, Login, Forgot Password.
- **Post-login translations**: User navigation menu (Settings, Sign Out) translated for all roles in both applications.
- **Custom filter dropdowns**: Course directory Language, Level, and Rating filters use custom dropdown components with flag images and consistent styling (replacing native `<select>` elements).
- **Internationalization framework**: `next-intl` with cookie-based locale management; translation files (`en.json`, `az.json`, `ru.json`) per application with namespaced keys.

---

### Added in 0.17.0 (February 2026)

#### Performance optimization (Phases 1–5)
- **N+1 query elimination**: Batch fetches for lessons, org admins, class stats, exam submission stats; parallel final-exam lookups; fixed nested awaits.
- **Supabase client reuse**: One `createClient()` per request across teacher, student, and admin pages (reduced from 10 → 1 in several routes).
- **React `cache()` and `unstable_cache`**: Session profile deduplication; public courses (60 s) and org list (120 s) caching.
- **Compression**: `compress: true` in Next.js config; `@fastify/compress` on API server.
- **Dynamic imports**: `next/dynamic` for heavy components with loading skeletons (`ExamCreator`, `TeacherCalendarHub`, `StudentAssistantClient`, `AIAgentWidget`).
- **Loading skeletons**: `loading.tsx` for all role routes (teacher, student, school-admin, platform-owner).
- **API parallelization**: Dashboard and document routes via `Promise.all`; 6-month sequential loop → 18 parallel fetches.
- **Narrow selects and count-only queries**: `PROFILE_FIELDS_NAV` in layouts; platform-owner stats use count queries.
- **Schema cache TTL**: 5 min → 30 min; production log level for agent package.

#### Database RLS policy overhaul
- **150+ warnings reduced to ~30**: Merged redundant permissive policies; fixed `auth.uid()` InitPlan evaluations; two new SQL migrations for consolidation.

#### Word document uploads
- `.doc` and `.docx` file support via `word-extractor` and `mammoth` libraries.
- File size limit increased from 10 MB to 15 MB.
- Document stats UI includes Word file type counts.

#### Lesson generation — manual objectives and grade level
- **Custom learning objectives**: Optional text field; when provided, AI structures the lesson around these objectives.
- **Grade level selector**: Grade 1–12, Undergraduate, Graduate, PhD — influences vocabulary, complexity, and examples.
- **Database**: `grade_level` column on `lessons` populated directly from API.

#### Cross-language RAG processing
- **Auto-detect document language**: On upload, content language is detected (Gemini) and stored in `content_language` column on `documents`.
- **Query translation**: If user's query language differs from document language, query is translated before embedding generation for accurate cross-language retrieval.
- **In-memory embeddings**: Bypass JSONB column size limits for large documents (600+ chunks); diagnostic warning when DB save count mismatches.
- **Document language display**: Globe badge in document list/grid views; language section in document info modal.

#### UI/UX enhancements
- Enhanced animations (fadeInUp, blob, glow-pulse) for ERP and ERP landing pages.
- Improved error handling for auth and Supabase downtime.

---

### Added in 0.16.0 (February 2026)
- **Upcoming exams (assistant + dashboard)**: Upcoming exams use the student calendar: exams and final exams due today or in the next 60 days, with correct due date and take link (including `?finalExamId=` for scheduled final exams).
- **Class Updates (assistant)**: 30-day window, published-only content, separate class-name lookup; fallback to latest 5 lessons + 5 exams when no recent updates so the section is not empty.
- **Real dashboard stats**: Student dashboard Completed exams and Average score from `exam_submissions`; Learning streak (ERP) from lesson and exam activity dates (consecutive days including today).
- **Student Assistant UX**: Refined hero, step tabs, and chat panel layout; duplicate header removed in drawer; chat column sizing and empty-state copy improved; FAB and drawer polished.
- **Dashboard empty-state copy**: Average score and Learning streak show "—" with short guidance when no data (e.g. "Take an exam to see your score"); duplicate "Ask AI Tutor" CTA removed from dashboard header.

---

### Added in 0.15.5 (February 2026)
- **Course completion certificates (ERP student)**: Students who **pass** the course final exam can view and download a **Certificate of Completion** (course title, student name, completion date, score). Certificate page at `/student/courses/certificate/[accessCode]` with “Download as PDF” (browser print → Save as PDF). Access only when enrolled and passed.
- **My Courses**: For passed courses, a **Certificate** button links to the certificate page.
- **Exam results**: When viewing results from a course run and the student passed, a **“View certificate & download PDF”** link is shown (requires accessCode in URL, which is included when coming from My Courses or course run → exam → results).
- **Core/UI**: Exam results include `passingScore`; results and exam-take clients support certificate link and course-run access code so the certificate is reachable after submitting the final exam from the course.

---

### Added in 0.15.0 (February 2026)
- **Find Courses (ERP)**: Course cards show rating (stars + count), enrollment count, and prominent language flag in header; filters for Language, Level, and Rating (4+ / 3+ / Has reviews); directory fetches ratings and enrollments in bulk.
- **Student – Find Courses & My Courses**: Student nav includes Find Courses (`/courses`) and My Courses (`/student/courses`). My Courses lists enrolled courses with “Open course” → course run; “Join with access code” form to enroll by code (works for students via admin-backed lookup).
- **Shareable course page (student)**: Not enrolled: “Join course” (enrolls, then page refreshes to show Start); enrolled: “Start course” (→ course run) and “My Courses”. No auto-enroll on view; access code box removed (join by button or code on My Courses).
- **Student course run**: `/student/courses/run/[accessCode]` – full course experience: lessons in order, Mark Complete (saved to lesson_progress), Next/Previous, Final exam link to `/student/exams/[id]` when all lessons done. Same run UI as teacher (CourseRunClient) with student-specific back/exam links and completion persistence.

---

### Added in 0.14.0 (February 2026)
- **Initial tokens for new users**: Platform setting "Initial tokens for new users" (Token settings page); configurable amount (e.g. 50, 100, 150; 0 to disable). Auto-granted on ERP signup, school admin create user, platform owner create school admin, and AI agent create_user.
- **Platform owner – user list**: Token balance column per user; user detail page shows token balance card and link to Usage & payments.
- **Collapsible sidebar**: Platform owner and school admin layouts have the same collapsible desktop sidebar as teacher (toggle in header; icon-only when collapsed).
- **API & integration docs**: Token system documented (402, GET /teacher/tokens, dashboard token_balance); integration guide and in-app API docs updated for token balance and 402 handling.
- **Other**: Usage & Payments page enhancements; CourseContentGenerating for empty lesson state in course detail; normalized language handling in course/lesson generation; API server teacher route import fix for exam schemas and types.

---

### Added in 0.13.0 (February 2026)
- **Token system & payments**: Token balances, usage settings, and transactions; deduction at every AI action (exam, lesson, course, chat, regenerate audio); 402 when insufficient balance; refund on AI failure. Platform owner: Usage & payments page (stats, usage table, payments table) and Token settings page (grouped cost config). Teacher: balance in header, /teacher/tokens page (balance, recent usage, “Buy more” link).
- **Course generation cost**: Course cost includes the final exam (same per-10-questions rate); one course = base + all lessons + exam.
- **Insufficient-balance messaging**: When balance is too low, users see: “Not enough tokens. This action requires X tokens. Your balance: Y. Please buy more tokens or contact your administrator.” Lesson, course, and exam UIs show “Not enough tokens” alert with “View balance & buy more tokens” link; chat shows the message in an alert.

---

### Added in 0.12.0 (February 2026)
- **Multi-document course generation**: Course structure and each lesson use **all** selected documents (not only the first). Structure prompt labels documents (DOCUMENT 1, 2, …); lessons map to documents (e.g. lesson 1 → doc 1). Final exam uses all lesson content; exam metadata stores `source_documents` array.
- **Course generation log**: Optional `generation_log` on course creation response (steps, timing, per-lesson success/failure) for debugging and support.
- **TTS retry**: Audio (TTS) generation retries on 5xx with backoff so temporary failures don't leave courses without audio.
- **Multi-document lesson generation**: Teachers can select multiple documents when generating a single lesson; RAG uses content from all selected docs. ERP "Generate AI Lesson" has multi-select documents (checkboxes).
- **Course-generated visibility**: Dashboard and reports exclude course-generated lessons from counts so standalone vs course-generated is consistent everywhere.

---

### Added in 0.11.2 (February 2026)
- **Course-generated vs standalone split**: New `course_generated` flag on lessons and exams. Course-generated items are visible only inside the course (not in lesson/exam lists, class materials, or calendar). Removed "Manual" / "From course" badges and source filter tabs; lists and calendar show only standalone content.

---

### Added in 0.11.0 (February 2026)
- **Learning objectives**: Lesson and course generation always preserve learning objectives; extraction from content and raw API response when the AI omits or truncates them; first lesson in a course no longer loses objectives.
- **Universal language codes**: All lessons and courses use 2-letter language codes (en, az, ru, …) in storage and API; language flags display correctly everywhere; `normalizeLanguageCode` and `getLanguageNameForPrompt` in config.
- **Course deletion feedback**: When a course cannot be deleted because a lesson or exam is assigned to a class, users see a clear alert: *"A lesson or exam from this course was added to a class. Remove it from the class first, then try again."*
- **Final exams & improvements**: Course final exams (ERP + ERP); document upload and exam/lesson deletion improvements; lesson content normalization and rendering options; ownership verification for exam/lesson deletion; teacher info (organization ID) fix.

---

### Added in 0.10.0 (February 2026)
- **Auth-aware public headers (ERP + ERP)**: Home, About, Pricing, Services (and on ERP: Find Teachers, teacher profile) show Dashboard + user menu when logged in; Sign In / Get Started when not.
- **Find Teachers & contact requests (ERP)**: Find Teachers directory (`/teachers`); teacher public profile (`/teachers/[id]`); contact requests with student name, email, avatar, bio (snapshot at submit); teacher profile tabbed page (Overview, Edit profile, Contact requests, Feedback); contact_requests table and migrations.
- **Teacher ratings & feedback (ERP)**: Students rate teachers (1–5 stars + optional comment) on the public teacher profile; one rating per student per teacher (re-rating updates); teacher Feedback tab shows summary and list; teacher_ratings table and RLS.
- **Student profile for contact (ERP)**: In Account settings (`/student/settings`), students can set profile photo, display name, and short bio; teachers see this when the student sends a contact request.

## 🏗️ Architecture

### Monorepo Structure
- **Turborepo** for efficient builds and task orchestration
- **Shared packages** for code reusability
- **Independent applications** (ERP and ERP) with shared dependencies
- **TypeScript** throughout for type safety

### Technology Stack
- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Backend**: Fastify 4.x, Node.js 20
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (JWT)
- **AI Models**:
  - Google Gemini 2.0 Flash (text generation, exam questions, translations)
  - Google Imagen 3.0 (lesson image generation)
  - Gemini 2.5 Flash Preview TTS (audio narration)

---

## 👥 User Roles & Access

### Platform Owner
- **Access**: Full platform administration
- **App**: ERP Application (`localhost:3001)
- **Theme**: Red color scheme
- **Capabilities**:
  - Manage all organizations
  - Create and configure organizations
  - Manage all users across platform
  - Approve/reject user registrations
  - View platform-wide analytics
  - Access comprehensive reports

### School Admin
- **Access**: Organization-level administration
- **App**: ERP Application (`localhost:3001`)
- **Theme**: Orange color scheme
- **Capabilities**:
  - Manage organization users (teachers and students)
  - Create and manage classes
  - Assign teachers to classes
  - Enroll students in classes
  - View organization analytics
  - Manage organization settings and location

### Teacher
- **Access**: Educational content creation
- **App**: ERP Application (`localhost:3001`)
- **Theme**: Blue color scheme
- **Capabilities**:
  - Upload and manage documents (PDF, MD, TXT)
  - Generate AI-powered exams from documents
  - Create AI-powered lessons with images and audio
  - Translate content to multiple languages
  - View and manage assigned classes
  - Share content with classes
  - **AI Teaching Assistant (EduBot)**: Lesson planning, exam creation help, teaching strategies, curriculum development, student assessment guidance, differentiation ideas, educational technology recommendations

### Student
- **Access**: Learning and assessment
- **App**: ERP Application (`localhost:3002`)
- **Capabilities**:
  - **AI Tutor (EduBot)**: 24/7 personalized learning support with Socratic teaching methods
  - Access teacher conversations from enrolled classes
  - Learn using teacher-assigned documents with context-aware tutoring
  - View class materials

---

## 📱 ERP Application Features

### Platform Owner Dashboard

#### Organizations Management
- **List View**:
  - Search by name, email, or slug
  - Filter by type (school, university, etc.)
  - Filter by subscription plan
  - Filter by status (active, inactive, suspended)
  - Pagination support
  - Statistics display

- **Create Organization**:
  - Organization name (auto-generates slug)
  - Organization type selection
  - Email and phone
  - Website URL
  - Subscription plan selection (Basic, Premium, Enterprise)
  - Auto-activation on creation

- **Edit Organization**:
  - Update all organization details
  - Change subscription plan
  - Update status
  - Edit URL slug

- **Organization Details**:
  - View complete organization information
  - See associated school admin
  - View organization statistics
  - Quick actions (edit, delete, add admin)

- **Add School Admin**:
  - Create new school admin user
  - Auto-assign to organization
  - Auto-approval for admins

#### Users Management
- **Comprehensive List**:
  - Search by name or email
  - Filter by role (platform_owner, school_superadmin, teacher, student)
  - Filter by approval status
  - Filter by organization
  - Pagination with 20 items per page
  - Statistics cards (total, by role, pending)

- **User Actions**:
  - View user details
  - Edit user information (name, email, role, organization)
  - Change user password
  - Approve/reject user registrations
  - Delete users
  - View user activity and metadata

#### Reports & Analytics
- Visual charts (bar charts, donut charts) for subscription plans, organization status, user roles
- Statistics dashboard (organizations, users, teachers, students, pending approvals)
- Export capabilities (organizations, users, usage statistics)

#### Settings
- Platform configuration management

#### Landing Pages
- Home, About, Services, and Pricing pages

### School Admin Dashboard

#### Users Management
- **Add Users**:
  - Create new teachers
  - Create new students
  - Auto-approval for organization users
  - Auto-assignment to organization
  - Email and password setup

- **User List**:
  - Search and filter by role, status
  - Statistics display
  - Quick actions (view, edit, approve, reject, delete)

- **User Actions**:
  - View, edit, and manage user details
  - Change passwords
  - Approve/reject registrations
  - Delete with confirmation

#### Classes Management
- **Class List**:
  - Search by name or class code
  - Filter by status (active/inactive)
  - View teacher and student counts
  - Quick actions (view, edit, delete)

- **Create Class**:
  - Class name and description
  - Assign primary teacher
  - Auto-generate unique class code
  - Set active status

- **Class Details**:
  - View class information
  - See assigned teachers (multiple support)
  - View enrolled students
  - **Add Teachers**: Dialog to assign multiple teachers
  - **Enroll Students**: Dialog to enroll students
  - Remove teachers and students
  - Edit class information
  - Copy class code for sharing

- **Class Actions**:
  - Edit class details
  - Toggle active status
  - Delete class (with cascade handling)

#### Reports
- Organization-specific analytics
- Class statistics
- User activity tracking

#### Settings
- **Organization Information**:
  - View organization details
  - Display subscription plan and status

- **Location Management**:
  - Street address
  - City
  - Country
  - Phone number
  - Website URL
  - Save with success/error feedback

### AI Agent System

#### Universal AI Agent (`@eduator/agent`)
- **Dual Mode System**:
  - **Think Mode**: Read-only operations for viewing and querying data
    - Execute SELECT queries only
    - Answer data questions and provide insights
    - Blocks all write operations with user-friendly error messages
    - Redirects users to Agent Mode for actions
  - **Agent Mode**: Full CRUD operations for administrative tasks
    - All Think Mode capabilities
    - Create organizations, users, classes, students, teachers
    - Update and manage entities
    - Multi-step operations with real-time progress tracking

- **Core Capabilities**:
  - **SQL Query Execution**: Execute optimized SELECT queries with automatic RLS enforcement
  - **Administrative Actions**: Create users, classes, students, teachers, and organizations via secure action tools
  - **Progress Tracking**: Real-time progress display for multi-step operations showing:
    - List of all steps to be executed
    - Current step being processed (with spinner animation)
    - Completed steps (with checkmarks)
    - Failed steps (with error messages)
  - **Security First**: All operations respect database RLS policies and user context
  - **Context Aware**: Understands differences between Platform Owner and School Admin contexts
  - **Intelligent Responses**: Natural language processing for user queries with structured tool execution

- **Query Features**:
  - Automatic query normalization (replaces `users`, `teachers`, `students` with `profiles`)
  - Automatic JOIN detection and addition for organization queries
  - Support for complex queries via Supabase RPC `execute_sql` function
  - AI-powered result formatting for human-readable responses
  - Query preprocessing to handle common user mistakes
  - Detailed logging for debugging and monitoring

- **Action Tools**:
  - `create_user`: Create new users with profiles (teachers, students, admins)
  - `create_organization`: Create new organizations with default values
  - `create_class`: Create classes with teacher assignments
  - `create_student`: Create student profiles with optional class enrollment
  - `create_teacher`: Create teacher profiles
  - Multi-step action support (e.g., create org + create admin in one request)

- **Language Support**:
  - Automatic language detection from user queries
  - Multi-language response generation (Azerbaijani, Russian, English, Turkish, etc.)
  - Language-specific system prompts
  - Context-aware translations

#### AI Agent Widget (`@eduator/ui`)
- **Floating Chat Widget**:
  - Modern, responsive floating chat interface
  - Minimize/maximize functionality with persistent header
  - Message count indicator
  - Smooth animations and transitions

- **Mode Switcher**:
  - **Think Mode**: For data queries and information retrieval
  - **Agent Mode**: For administrative actions (create users, classes, organizations)
  - Visual mode indicators

- **QA Modal**:
  - Help button (`HelpCircle` icon) opens example questions modal
  - 15-20 categorized example questions
  - Separate examples for Think Mode and Agent Mode
  - Quick question insertion

- **Enhanced Result Display**:
  - Success badges for completed actions
  - Formatted data tables (first 20 rows) with expandable view
  - Improved markdown rendering
  - Color-coded sections (success, info, warning)
  - Raw data display in expandable format
  - Better empty states and loading indicators

#### Platform Owner AI Agent Access
- Full access to all organizations and users
- Can query data across all organizations
- Can create organizations and assign admins
- Can perform administrative actions on any entity

#### School Admin AI Agent Access
- Organization-scoped queries and actions
- Can manage users and classes within organization
- Can query organization-specific data
- Can create users, classes, students, and teachers for their organization

#### Documentation
- **POSSIBLE_QUESTIONS.md**: Comprehensive list of 200+ example queries
  - Categorized by entity type (Users, Organizations, Classes, Exams, Lessons, Documents)
  - Multi-language examples (English, Azerbaijani)
  - Query pattern notes and best practices
  - Instructions for adding new patterns

---

## 🎓 Teacher Portal

### Dashboard (`/teacher`)
- **Personalized Greeting**: Time-based greeting with teacher name
- **Organization Badge**: Shows current organization
- **Statistics Cards**:
  - 📚 Total Classes (with link to classes page)
  - 📝 Published Exams count
  - 📁 Total Documents
  - 🎓 Total Lessons
  - 👥 Total Students across classes
- **Recent Exams**: Last 5 exams with status, questions, points, languages
- **Recent Documents**: Last 5 documents with file info and quick view
- **Your Classes**: Colorful cards showing assigned classes

### Document Management (`/teacher/documents`)
- **Upload**: Drag & drop interface, supports PDF/Markdown/Text (10MB limit), progress indicator
- **Library**: Grid layout with search, file info display, color-coded icons
- **Management**: Edit title/description, assign to classes, delete with confirmation

### AI Exam Generation (`/teacher/exams/new`)
- **5-Step Wizard**: Generate → Translate → Edit → Assign → Publish
- **Generation Settings**: Question type distribution, difficulty distribution, custom AI prompts
- **Question Types**: Multiple Choice, True/False, Short Answer, Fill-in-the-Blank
- **Multi-Language Support**: 8+ languages with instant switching and retranslate
- **Live Editing**: Edit questions, answers, difficulty, points; add/remove questions
- **Summary Panel**: Question type breakdown, difficulty distribution, total points, available languages

### Exam Management (`/teacher/exams`)
- **List View**:
  - Direct action icons (no dropdown menu)
  - Language flags column
  - Status badges
  - Question count and points
- **Detail Page**:
  - Language switcher with flags
  - Paginated questions view
  - Difficulty badges
  - Edit/Delete/Publish actions

### AI Lesson Generation (`/teacher/lessons/generate`)
- **Configuration**:
  - Topic and grade level
  - Document selection for RAG-based generation
  - Output language with flags
  - Include: Images, Audio, Mini-test, Examples
  - Center text alignment option
  - Duration setting
- **Generated Content**:
  - Rich HTML content using RAG (Retrieval Augmented Generation) from documents
  - AI-generated images (Google Imagen 3.0)
  - Audio narration (Gemini TTS) with background processing
  - Quiz questions
  - Practical examples
- **Auto-Redirect**: To lesson detail after generation

### Lesson Management (`/teacher/lessons`)
- **Lesson Detail Page**:
  - Tabbed interface: Content, Images, Mini-Test, Examples
  - Expandable image cards
  - Enhanced audio player with advanced controls (play/pause, seek, mute, time display)
  - Progress bar with click-to-seek
  - Edit dialog for metadata
  - Regenerate audio without recreating entire lesson
  - Publish/Unpublish toggle

### AI Course Creation (`/teacher/courses/create`)
- **5-Step Wizard**: Documents → Blueprint → Options → Generation → Summary
- **Step 1 – Documents**: Select source documents for RAG-based course generation
- **Step 2 – Blueprint**: Configure course (title, number of lessons, difficulty, style, language, optional topic, lesson topics, exam settings)
- **Step 3 – Options**: Optional generation options before starting
- **Step 4 – Generation**: Live progress (analyzing documents, creating structure, generating lessons with per-lesson status)
- **Step 5 – Summary**: Generated course overview with link to course detail
- **Course Run** (`/teacher/courses/[id]/run`): Coursera/Udemy-style player with sidebar, lesson navigation, time tracking, audio playback, final exam link

### Class Management (`/teacher/classes`)
- Modern card design with color schemes and stats
- Class details with copyable class code
- Statistics cards (Students, Exams, Documents, Lessons)

### Smart Calendar Hub (`/teacher/calendar`)
- **Unified Calendar Interface**:
  - Weekly grid view (Monday-Sunday) with working hours (9:00 AM - 6:00 PM)
  - Toggle between working hours and full 24-hour view
  - Visual event indicators with color coding (Violet for Exams, Emerald for Lessons)
  - Today's date highlighting with event count badges
  - Smooth week navigation (Previous/Today/Next buttons)
  - Weekly event count summary

- **Drafts Sidebar**:
  - Left-side drawer with "Ready-to-Use" AI-generated materials
  - Separate sections for Exams and Lessons with counts
  - Searchable draft library with real-time filtering
  - Pagination support (15 items per page) for scalability
  - Drag-and-drop enabled for all draft materials
  - Visual status indicators (Published/Draft badges)
  - Optimized for large datasets (100+ items)

- **Drag-and-Drop Scheduling**:
  - Drag materials from sidebar directly to calendar time slots
  - Drag existing calendar events to reschedule
  - Visual feedback during drag (glowing drop zones)
  - Automatic class selection dialog on drop
  - Support for both exams and lessons scheduling
  - Real-time calendar updates after scheduling

- **Class Filtering & Management**:
  - Searchable class dropdown filter
  - Event count per class display
  - Filter calendar view by selected class
  - Auto-select class for new assignments when filter is active
  - Support for teachers assigned via `class_teachers` junction table

- **Quick Edit Panel**:
  - Slide-in panel for event details and editing
  - Edit event time, class assignment, and status
  - Delete scheduled events with confirmation
  - Smooth animations and transitions

- **Live Status Dashboard**:
  - Student count indicators on calendar events
  - Active students display (e.g., "18/25 Students")
  - Visual progress bubbles for engagement tracking
  - Real-time enrollment data integration

### Content Sharing (`/teacher/classes/[id]`)
- Share exams, documents, and lessons with classes
- Multi-select dialogs with "Select All"
- View all shared content with ability to remove

### Reports (`/teacher/reports`)
- Statistics overview and exam status breakdown

### AI Teaching Assistant (`/teacher/chat`)
- **EduBot - AI Teaching Assistant**:
  - Conversation management with custom naming
  - Document-based RAG for context-aware responses
  - Class assignment for student access
  - Multiple explanation styles (simple, detailed, visual, example-based)
  - Automatic language detection and response
  - Message history with sources and metadata
  - Help with lesson planning, exam creation, teaching strategies, curriculum development, student assessment, differentiation, and educational technology

### Settings (`/teacher/settings`)
- Profile and organization information

---

## 🎨 User Interface

### Design System
- **Role-Based Color Themes**: Red (Platform Owner), Orange (School Admin), Blue (Teacher)
- **Responsive Design**: Mobile-first approach with consistent spacing and typography
- **Modern Components**: Reusable UI library with dialogs, forms, tables, charts, and navigation
- **User Experience**: Loading states, error handling, success feedback, empty states, and accessibility support

---

## 🤖 AI Features

### AI Teaching Assistant (EduBot)
- **Teacher AI Assistant**:
  - **Lesson Planning**: Create comprehensive lesson plans, learning objectives, and teaching activities
  - **Exam Creation**: Assist with generating questions, creating assessments, and designing rubrics
  - **Teaching Strategies**: Provide evidence-based teaching methodologies and classroom management tips
  - **Curriculum Development**: Help align content with standards and create scope and sequence
  - **Student Assessment**: Suggest formative and summative assessment strategies
  - **Differentiation**: Provide ideas for accommodating diverse learners
  - **Educational Technology**: Recommend tools and resources for enhancing instruction
  - **Document-Based RAG**: Context-aware responses using uploaded documents
  - **Conversation Management**: Custom naming, class assignment, message history with sources
  - **Multi-Language Support**: Automatic language detection and response (Azerbaijani, Russian, English, Turkish, etc.)
  - **Explanation Styles**: Simple, detailed, visual, or example-based responses

- **Student AI Tutor**:
  - **Socratic Teaching**: Guide students to discover answers through thoughtful questions
  - **Step-by-Step Explanations**: Break down complex problems into manageable steps
  - **Understanding Verification**: Check comprehension with follow-up questions
  - **Real-World Connections**: Relate academic concepts to practical applications
  - **Personalized Learning**: Adapt to grade level, subject, and learning style
  - **Document-Based Learning**: Access teacher-assigned documents for context-aware tutoring
  - **Access Control**: Read-only access to teacher conversations from enrolled classes
  - **Multi-Language Support**: Automatic language detection and response

### Exam Generation
- Document content analysis using RAG
- Contextual question generation
- Multiple question types (Multiple Choice, True/False, Short Answer, Fill-in-the-Blank)
- Difficulty level assignment (Easy/Medium/Hard)
- Answer key generation
- Custom prompt configuration

### Lesson Generation
- **Document-Based Generation (RAG)**: Generate lessons from uploaded documents
- Topic-based content creation
- Grade level adaptation
- PDF, Markdown, and Text content extraction
- Image generation (Google Imagen 3.0)
- Audio narration (Gemini TTS) with background processing
- Audio regeneration for existing lessons
- Quiz and practical examples generation

### Translation
- Multi-language support (8+ languages: English, Azerbaijani, Russian, Turkish, German, French, Spanish, Arabic)
- Context-aware translation
- Preserve formatting and structure
- Retranslate functionality

---

## 🔐 Security Features

### Authentication
- JWT-based authentication via Supabase
- Secure session management
- Cookie-based token storage
- Automatic token refresh

### Authorization
- Role-based access control (RBAC)
- Route protection via middleware
- API endpoint authorization
- Row-Level Security (RLS) in database

### Data Protection
- Input validation on all forms
- SQL injection prevention
- XSS protection
- Secure password handling
- Audit logging capabilities

---

## 🗄️ Database

### Schema
- **Core**: Organizations, Profiles, Classes, Class Enrollments, Class Teachers
- **Content**: Documents, Exams, Exam Submissions, Lessons
- **Communication**: Chat (AI chat history)

### Storage Buckets
- **documents**: Uploaded files (PDF, MD, TXT)
- **lesson-images**: AI-generated images
- **lesson-audio**: TTS-generated audio files

### Features
- Row-Level Security (RLS) policies
- Security definer functions and database triggers
- Performance indexes and foreign key constraints
- Timestamps and soft delete support

---

## 📡 API

### Endpoints
- **Platform Owner**: Organizations CRUD, users management, reports and analytics
- **School Admin**: Organization users, classes management, organization settings
- **Teacher**: Documents CRUD, exams/lessons CRUD with AI generation, class content sharing
- **Profile**: Get and update current user profile

### Features
- OpenAPI 3.0 documentation
- JWT authentication with role-based route protection
- Request validation and error handling
- Rate limiting ready

---

## 🚀 Performance

### Optimizations
- Database query optimization with indexed queries
- Pagination for large datasets
- Code splitting and lazy loading
- Image optimization
- React memoization (useMemo/useCallback)

### Monitoring
- Error logging and performance metrics
- Database query monitoring

---

## 📦 Package Structure

### Shared Packages
1. **@eduator/config**: Environment, constants, AI model configuration
2. **@eduator/core**: Types, validation, stores, hooks
3. **@eduator/auth**: Supabase authentication
4. **@eduator/db**: Database repositories
5. **@eduator/ai**: Google Gemini, Imagen, TTS integration
6. **@eduator/api-client**: HTTP client and hooks
7. **@eduator/api-server**: Fastify REST API
8. **@eduator/ui**: React component library

---

## 🔄 Key Workflows

### Content Creation
- **Exam Creation**: Upload documents → Configure AI generation → Review/Edit → Translate → Assign to class → Publish
- **Lesson Creation**: Select document or enter topic → Configure options → AI generates content (RAG, images, audio) → Review/Edit → Regenerate audio if needed → Share with class → Publish

### User & Organization Management
- **Registration**: User signs up → Profile created (pending) → Admin approves → Access granted
- **Organization Setup**: Create organization → Assign subscription → Add School Admin → Manage users and classes
- **Class Management**: Create class → Assign teachers → Enroll students → Share class code

---

## 📚 Additional Resources

- See [ROADMAP.md](./ROADMAP.md) for planned features and future releases
- See [TECHNICAL.md](./TECHNICAL.md) for technical architecture details
