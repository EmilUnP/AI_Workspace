# Eduator AI v2.1 - Product Roadmap

## 🎯 Vision

Transform education through AI-powered tools that save educators time and enhance student learning experiences.

---

## ✅ Completed Versions

*(Chronological order: 0.1.0 → … → 2.1.0. **Current Release: 2.1.0**.)*

### Version 2.1.0 - Reporting intelligence + class workflow unification (April 2026)
✅ **Teacher reports major upgrade**: Introduced filter-driven reporting with range/class/state controls, URL-synced state, metric deltas, and actionable insights.  
✅ **Drilldown analytics delivered**: Added class and student drilldown routes with trend/timeline visibility and richer intervention context.  
✅ **Class-to-report continuity**: Embedded report navigation directly into class students/reporting flows for faster teacher action loops.  
✅ **Platform maturity milestone**: Transitioned toward a real-server operational profile with broader backend capabilities and release hardening.

### Version 1.0.5 - Final exam random pool + scoring alignment (March 2026)
✅ **Randomized final exam pools**: Added `random_pool` mode with configurable `questions_per_attempt`.
✅ **Teacher/admin control**: Final exam create/edit supports pool-based configuration and improved select-all/unselect-all controls.
✅ **Student consistency**: Delivery, scoring, and results are now computed from the same effective subset for each student.
✅ **Visibility upgrades**: Final exam list/detail pages now show question mode and per-attempt question count.
✅ **DB support**: Added migration for final exam mode and per-attempt settings with constraints/defaults.

### Version 1.0.4 - AI prompt quality hardening + roadmap refresh (March 2026)
✅ **Prompt engineering hardening**: Strengthened educational writing rules across exam, lesson, question, course, plan, and chatbot generation.
✅ **Anti-filler safeguards**: Added strict anti-filler and anti-source-referencing instructions plus explanation sanitization for cleaner outputs.
✅ **Explanation quality pass**: Mini-test and exam explanations refined to be direct, concise, and classroom-friendly.
✅ **Roadmap refresh**: Future planning section rewritten to remove stale placeholders and align with practical product priorities.

### Version 1.0.3 - Exam/Course generation quality + UX polish (March 2026)
✅ **Exam generation contract accuracy**: Improved topic parsing and stricter post-generation topic/count enforcement.
✅ **Course Step 3 final exam UX refresh (ERP + ERP)**: Cleaner and more compact final exam options, improved summaries, and collapsible settings.
✅ **Lesson content Mermaid rendering hardening**: Mermaid support added with normalization/repair for malformed AI outputs.
✅ **Slider consistency**: Unified filled-track slider visuals in course-create and exam-creator.
✅ **Docs & release sync**: Changelog and features docs aligned; version bumped to 1.0.3.

### Version 1.0.2 - Login UX and lesson-generation quality (March 2026)
✅ **Auth UX updates**: Improved login and forgot-password behavior/messages in ERP and ERP.
✅ **Lesson generation updates**: Prompting and behavior refinements in lesson generation service.
✅ **Release packaging**: Version bump and release documentation sync for 1.0.2.

### Version 1.0.1 - Cross-app routing cleanup (March 2026)
✅ **Single marketing source**: Removed duplicated ERP marketing pages and aligned routing/redirect behavior.
✅ **Cross-app URL helpers**: Added centralized URL helpers for app/ERP/API/marketing links.
✅ **ERP i18n cleanup**: Removed obsolete public namespaces.

### Version 1.0.0 - Rebrand and stable baseline (March 2026)
✅ **Platform rebrand**: EduSpace → Eduator (`eduspace.ai` → `eduator.ai`) across apps/packages/docs.
✅ **Package scope migration**: Imports/package names aligned to `@eduator/*`.
✅ **Stable baseline release**: Workspace aligned and released as 1.0.0.

### Version 0.18.0 - Student profile full i18n (March 2026)
✅ **Student exams i18n**: List, take exam, and results — full translation; final exam text and question type labels; raw message templates for placeholders to avoid formatting errors.
✅ **Student classes i18n**: List and class detail fully translated (ERP + ERP).
✅ **Student calendar i18n**: Sections, empty states, hints (ERP + ERP).
✅ **My Courses i18n (ERP)**: Courses list, certificate, course run — student namespaces (`studentCourseRun`, `studentLessonDetail`); `CourseRunClient` uses `useStudentTranslations` in student context.
✅ **Study assistant i18n**: FAB + drawer fully translated; step tabs, today activity, exams/lessons/updates/progress, chat prompts; FAB button title/aria via client wrapper; template keys from `getMessages()` to avoid placeholder errors.

### Version 0.17.30 - Student join by code + teacher confirmation (ERP) (March 2026)
✅ **Join by code → pending**: Student join creates `pending` enrollment; student sees Pending approval section and success message.
✅ **Teacher: Confirm / Reject**: Pending join requests section on class detail; Confirm sets `active`, Reject deletes enrollment. “Add students” removed; confirm-only flow.
✅ **Remove student**: Teacher can remove an enrolled student from the class (Enrolled Students section with Remove button).
✅ **DB migration**: `class_enrollments_status_check` updated to allow `'pending'`; migration and README in `supabase/`.

### Version 0.17.26 - Teacher calendar usability (March 2026)
✅ **Weekly navigation**: View any week; Prev/Next/Today; “Today” label only for current week.
✅ **Final exams on calendar**: Final exams from Final Exams appear on calendar; amber color and legend (Exam / Final exam / Lesson).
✅ **Confirm & publish week**: Single action in top bar to publish all draft events for the viewed week.
✅ **Unpublish**: Revert published events to draft from Quick Edit Panel; `unpublishMaterial` server action (ERP + ERP).
✅ **Refresh**: All calendar mutations trigger revalidation and `router.refresh()` so UI updates without manual reload.
✅ **UX**: Confirm week button moved to hub top bar; Quick Stats (exams/lessons/classes counts) removed; per-event Confirm & publish removed from Quick Edit Panel.

### Version 0.17.25 - Teacher calendar & classes full i18n (February 2026)
✅ **Teacher calendar i18n**: Calendar Hub, Materials Library (DraftsSidebar), Quick Edit Panel, SmartCalendar (day names, nav, view toggle, event types) — all via `teacherCalendar` namespace (ERP + ERP, en/az/ru).
✅ **Teacher classes i18n**: List, create, detail — copy class code, share exam/document/lesson dialogs, shared content list, enroll students modal, AI Tutor section and link modal; `teacherClasses` namespace and label props.
✅ **Education plans i18n**: Create, detail, edit — form sections, audience selector, week placeholder; full translation.
✅ **Calendar UX**: Removed Live/Unused badge from draft items in Materials Library sidebar.
✅ **Label types**: TeacherCalendarHubLabels, Share*DialogLabels, SharedContentListLabels, EnrollStudentDialogLabels, ClassAITutorLabels exported from `@eduator/ui`.

### Version 0.17.16 - Path-based i18n message splitting (February 2026)
✅ **Module mapping**: `i18n/module-mapping.ts` maps pathname → public | teacher | student (ERP); ERP adds platform-owner | school-admin.
✅ **Split message folders**: Messages in `messages/<module>/` (en, az, ru); app loads only the module for the current path; non-public routes get public + module merged.
✅ **x-pathname header**: Middleware sets request header; request.ts uses it for path-based dynamic imports.
✅ **Cleanup**: Root en/az/ru.json and split scripts removed; ERP admin messages removed; ERP uses separate platform-owner and school-admin folders.
✅ **README**: `messages/README.md` in both apps describing folder layout.

### Version 0.17.11 - i18n formatting fixes (February 2026)
✅ **Duplicate teacherProfile key**: Renamed second namespace to `teacherProfilePage` in ERP messages; profile page and tabs updated.
✅ **Documents i18n**: `explorerBrowseToUpload` interpolation with `browse`; delete confirm uses `#TITLE#` placeholder and runtime replace in edit-dialog.
✅ **Teacher dashboard placeholders**: All `{n}` → `#N#` in teacherDashboard messages (both apps, en/az/ru); `plural()` and date formatting use `#N#` at runtime.

### Version 0.17.10 - Full teacher panel i18n (February 2026)
✅ **Teacher navigation i18n**: All sidebar items translated via `getTranslations('teacherNav')` in ERP and ERP layouts.
✅ **Teacher pages i18n**: Courses (list + wizard), Lessons (list + generate), Exams (list + create), Final Exams, Documents, Education Plans, Tokens, Chat, Teaching Studio, Settings, Profile — all use `useTranslations()`.
✅ **Student pages i18n**: Student layout and settings translated.
✅ **Shared UI i18n**: `TeacherSettingsTranslations` interface in `@eduator/ui`; `TeacherSettingsClient` and `TeachingStudioHub` accept translated props.
✅ **2500+ new translation lines**: 400+ keys per language file (az/en/ru × ERP/ERP).
✅ **End-to-end i18n**: Combined with v0.17.5, the entire app is fully translatable (English, Azerbaijani, Russian).

### Version 0.17.9 - RAG embedding optimization & auth resilience (February 2026)
✅ **Embedding dimensions 3072 → 768**: Matryoshka MRL via `outputDimensionality` on Gemini REST API; ~84% payload reduction with minimal quality loss (Google-recommended).
✅ **Chunk size 2500 → 4000 chars**: Larger chunks retain more context; chunk count reduced ~37% (672 → ~420 for 1.5M-char documents).
✅ **Batch REST API**: `batchEmbedContents` endpoint (100 texts/request) replaces old 5-per-batch SDK; API round trips drop from ~134 to ~5 for large documents.
✅ **Direct REST API**: Replaced deprecated `@google/generative-ai` SDK with direct `fetch()` to Gemini REST for `outputDimensionality` control.
✅ **Fallback embeddings table**: New `document_chunk_embeddings` table (one row per chunk) with retry logic (3 attempts, 2s delay) for transient Supabase/Cloudflare 520/521 errors.
✅ **Auth resilience**: Middleware, server auth, and login actions catch `TypeError` from Supabase returning HTML during outages; no crash, no forced logout.
✅ **Error log normalization**: Supabase HTML error responses converted to short readable messages.
✅ **Centralized config**: `EMBEDDING_DIMENSIONS: 768` in `AI_MODELS` constant.

### Version 0.17.7 - Turborepo, Vercel fixes, Next.js 15 (February 2026)
✅ **Turborepo**: Build and dev use Turbo with filters; per-app builds on Vercel; optional `turbo-ignore` for deploy-only-when-changed.
✅ **Vercel deployment**: All three apps use `turbo run build --filter=<app>` in vercel.json; install from repo root.
✅ **Next.js 15**: Client wrappers for dynamic imports with `ssr: false` (StudentAssistantClient, ExamCreator) in ERP and ERP so Server Components no longer use disallowed pattern.
✅ **Build fix**: `@types/word-extractor` in `@eduator/ai` for Vercel/TS build.

### Version 0.17.5 - Multi-language support (February 2026)
✅ **Internationalization (i18n)**: `next-intl` with cookie-based locale management for ERP and ERP; English, Azerbaijani, and Russian.
✅ **Language switcher**: Shared `LanguageSwitcher` component with country flag images; app-specific wrappers for locale persistence.
✅ **ERP pages translated**: Landing, About, Services, Pricing, Login, Sign Up, Forgot Password, Find Teachers, Teacher Profile, Find Courses, Course Details.
✅ **ERP pages translated**: Landing, About, Services, Pricing, Login, Forgot Password.
✅ **Post-login translations**: User nav (Settings, Sign Out) in both apps; custom FilterDropdown component with flags for course directory filters.

### Version 0.17.0 - Performance, RLS overhaul, RAG & lesson features (February 2026)
✅ **Performance optimization (Phases 1–5)**: N+1 query elimination, Supabase client reuse, React cache/unstable_cache, compression (Next.js + Fastify), dynamic imports with loading skeletons, API parallelization, narrow selects, schema cache TTL increase, production log level. Net: −715 lines across 33 files.
✅ **RLS policy overhaul**: Merged 150+ permissive policies to ~30; fixed `auth.uid()` InitPlan warnings; two consolidation migrations.
✅ **Word document uploads**: `.doc` and `.docx` support via word-extractor/mammoth; file size limit 10 MB → 15 MB.
✅ **Lesson generation — objectives & grade**: Manual learning objectives input; grade level selector (Grade 1–12, Undergraduate, Graduate, PhD) with grade-aware AI prompts; `grade_level` column populated in DB.
✅ **Cross-language RAG**: Auto-detect document language on upload (`content_language` column); translate query to document language before embedding; in-memory embeddings for large documents (bypass JSONB limits).
✅ **Document language display**: Globe badge in list/grid views; language section in document info modal.
✅ **UI/UX**: Enhanced landing page animations (blob, glow-pulse); improved auth error handling.
✅ **Dependencies**: Updated @supabase/ssr, esbuild, fastify; added word-extractor, mammoth.

### Version 0.16.0 - Student Assistant & dashboard (February 2026)
✅ **Upcoming exams**: Assistant and student dashboard use student calendar (today + 60 days); include final exams; correct due date and take link with `finalExamId` when applicable.
✅ **Class Updates**: 30-day window, published content only, fallback to latest lessons/exams; class names from separate query.
✅ **Dashboard stats**: Completed exams and average score from exam_submissions; Learning streak (ERP) from activity dates.
✅ **Assistant UX**: Hero and step layout refined; duplicate header removed in drawer; chat panel layout and FAB/drawer polished.
✅ **Empty states**: Average score and streak show "—" with guidance when no data; duplicate "Ask AI Tutor" removed from dashboard header.

### Version 0.15.5 - Course completion certificates (February 2026)
✅ **Certificate of completion**: Only for students who pass the course final exam; view and download as PDF.
✅ **Certificate page**: `/student/courses/certificate/[accessCode]` with course name, student name, date, score; “Download as PDF” via print dialog.
✅ **My Courses**: “Certificate” button for passed courses; exam results show “View certificate & download PDF” when passed and from course run.
✅ **URL flow**: accessCode in course run → exam → results so certificate link appears after submit when passed.

### Version 0.15.0 - Student Courses & Find Courses (February 2026)
✅ **Find Courses**: Rating and enrollment on cards; Language/Level/Rating filters; prominent language flag; bulk ratings/enrollments in directory.
✅ **Student courses (ERP)**: Find Courses and My Courses in nav; My Courses page with enrolled list and “Join with access code”; shareable page shows Join then Start (no auto-enroll); enrollment and count use admin client for RLS.
✅ **Student course run**: Full run at `/student/courses/run/[accessCode]` (lessons, Mark Complete → lesson_progress, Final exam); teacher CourseRunClient extended for student back/exam URLs and completion persistence.

### Version 0.1.0 - Foundation (January 2025)
✅ Monorepo architecture, database schema, authentication, Platform Owner & School Admin dashboards, user/class management, analytics

### Version 0.2.0 - Teacher Portal & AI Features (January 2026)
✅ Document management, AI exam generation, AI lesson generation, multi-language support, class management, content sharing

### Version 0.3.0 - Enhanced Lesson Generation (January 2026)
✅ Document-based RAG lesson generation, audio regeneration, enhanced audio player

### Version 0.4.0 - Enhanced Features (January 2026)
✅ Enhanced document statistics, improved performance, better error handling

### Version 0.5.0 - AI Teaching Assistant & Tutor (January 2026)
✅ **AI Teaching Assistant (EduBot)**: Lesson planning, exam creation help, teaching strategies, curriculum development, student assessment guidance, differentiation ideas, educational technology recommendations
✅ **AI Tutor (EduBot)**: Socratic teaching methods, step-by-step explanations, understanding verification, personalized learning support
✅ Document-based RAG, automatic language detection, conversation management, class assignment

### Version 0.6.0 - Universal AI Agent System (January 2026)
✅ **Universal AI Agent (`@eduator/agent`)**: Intelligent assistant for Platform Owners and School Admins
✅ **SQL Query Execution**: Execute SELECT queries with automatic RLS enforcement
✅ **Administrative Actions**: Create users, classes, organizations, students, teachers via natural language
✅ **Multi-Step Actions**: Create organization + admin in single request
✅ **AI Agent Widget**: Floating chat interface with Think/Agent mode switcher
✅ **QA Modal**: Example questions for quick reference
✅ **Multi-Language Support**: Automatic language detection and response matching
✅ **Voice Input (STT)**: Speech-to-Text transcription support for hands-free interaction
✅ **Audio Transcription**: Google Cloud Speech-to-Text integration with automatic language detection
✅ **UI Voice Features**: Microphone button, recording timer, transcription preview, and text editing
✅ **Query Normalization**: Handles common mistakes (users → profiles, automatic JOINs)
✅ **AI-Powered Formatting**: Human-readable result formatting
✅ **Comprehensive Documentation**: 200+ example queries in POSSIBLE_QUESTIONS.md

### Version 0.7.0 - AI Curriculum Architect & Course Management (January 2026)
✅ **AI Curriculum Architect**: Transform documents into dynamic, multi-level, multi-lingual self-paced courses
✅ **5-Step Course Creation Wizard**: Documents → Blueprint → Options → Generation → Summary
✅ **Multi-Lesson Course Generation**: AI generates complete course structures with sequential lessons
✅ **Final Exam Generation**: Configurable exam with question types, difficulty distribution, and settings
✅ **Course Run/Player Interface**: Coursera/Udemy-style course player with sidebar navigation
✅ **Real-Time Time Tracking**: Automatic time tracking for each lesson with live updates
✅ **Audio Player Integration**: TTS audio playback in course run view
✅ **Course Management**: Edit, delete, and publish/unpublish courses
✅ **Enhanced Course Detail Page**: Comprehensive course information with final exam details
✅ **Content Source Tracking**: Filter lessons/exams by source (Manual vs Course-generated)
✅ **Question Types & Difficulty Breakdown**: Visual display of exam composition
✅ **Background Audio Generation**: TTS audio generation during course creation
✅ **Lesson/Exam Metadata**: Track course relationships for better organization

### Version 0.7.5 - Teacher's Smart Calendar Hub (January 2026)
✅ **Smart Calendar Hub**: Unified calendar interface for scheduling lessons and exams
✅ **Weekly Grid View**: Monday-Sunday layout with working hours (9:00 AM - 6:00 PM) and 24-hour toggle
✅ **Drafts Sidebar**: Left-side drawer with searchable, paginated draft materials library
✅ **Drag-and-Drop Scheduling**: Drag materials from sidebar to calendar slots, reschedule existing events
✅ **Class Filtering**: Searchable class dropdown with event counts and auto-selection
✅ **Quick Edit Panel**: Slide-in panel for event details, time editing, and deletion
✅ **Live Status Dashboard**: Student count indicators and active students display on events
✅ **Database Schema Updates**: Added `start_time`/`end_time` to `lessons` table, simplified `class_teachers` role
✅ **UI/UX Enhancements**: Glassmorphism design, haptic dragging, color-coded events, optimized for 50+ classes and 100+ events

### Version 0.8.0 (January 2026)
✅ **Version & docs alignment**: Release 0.8.0 (package, CHANGELOG, docs)
✅ **Documentation**: 5-step course creation wizard reflected across FEATURES, CHANGELOG, README, API server Swagger
✅ **Agent docs**: TECHNICAL.md and docs/agent updated with agentic improvements
✅ **API server**: Version in Swagger, health, and /api/v1; Teacher endpoints updated

### Version 0.9.x (February 2026)
✅ **Student exams – multiple attempts**: Students can retake exams; each attempt stored with server-computed score; list and take page show attempt count, best score, average score
✅ **Student exam UX**: A/B/C/D variant labels on options; explanations shown after answering and on results page; question text fix for calendar/translated exams (normalized `question` from `text`)
✅ **Student UI/UX**: Calendar hero header and improved empty state; lessons list class filter and filtered count; classes list filtered count; exam list "Your attempts" column; removed Status column and debug logs
✅ **Student progress dashboards (v0.9.6)**: ERP + ERP "My Progress" pages with lesson time tracking, completion overview, and exam performance charts
✅ **Unified student settings (v0.9.6)**: Minimal `/student/settings` page in both apps for account info and sign-out; sidebar "Profile" entry removed

### Version 0.10.0 (February 2026)
✅ **Auth-aware public headers (ERP + ERP)**: Public pages show logged-in state (Dashboard + UserNav or Sign In); applied on home, about, pricing, services, Find Teachers (ERP), org/[slug] (ERP)
✅ **Find Teachers & contact requests (ERP)**: Contact requests with student name, email, avatar, bio; CONTACT_REQUESTS_STUDENT_INFO.sql
✅ **Student profile (ERP)**: Editable profile photo, display name, short bio in Account settings; visible to teachers in contact requests
✅ **Teacher profile – tabbed**: Overview, Edit profile, Contact requests, Feedback; filters, pagination, delete on requests
✅ **Teacher ratings & feedback**: Students rate teachers (1–5 stars + comment) on Find Teachers; one per student-teacher (re-rate updates); teacher Feedback tab shows summary and list; TEACHER_RATINGS_MIGRATION.sql
✅ **Version & docs**: Release 0.10.0 (package, CHANGELOG, FEATURES, ROADMAP)

### Version 0.13.0 - Token System & Payments (February 2026)
✅ **Token system (Phases 1–3)**: DB (token_balances, token_usage_settings, token_transactions, payments), RPCs (deduct_tokens, add_tokens), core types and getTokenCost, tokenRepository; deduction at every AI call (exam, lesson, course, chat, regenerate audio) with 402 and refund on failure
✅ **Course generation cost**: Includes final exam (exam_question_count); one course = base + lessons + exam
✅ **Platform owner**: Usage & payments page (stats, usage table, payments table); Token settings page (grouped, inline edit)
✅ **Teacher UI**: Balance in layout header, /teacher/tokens page (balance, recent usage, “Buy more”); insufficient-balance message: “Not enough tokens. This action requires X tokens. Your balance: Y…” with “View balance & buy more tokens” link on lesson/course/exam
✅ **Import fix**: tokenRepository from @eduator/db/repositories/tokens everywhere for reliable resolution
✅ **Version & docs**: Release 0.13.0 (package, CHANGELOG, FEATURES, ROADMAP, TOKEN_* docs)

### Version 0.14.0 (February 2026)
✅ **Initial tokens for new users**: Configurable from Token settings (e.g. 100 default); auto-grant on signup, school admin create user, platform owner create school admin, agent create_user
✅ **Platform owner users list**: Token balance column; user detail token balance card and link to Usage & payments
✅ **Collapsible sidebar**: Platform owner and school admin desktop sidebars collapse to icon strip (same as teacher)
✅ **API & integration docs**: Token system (402, GET /teacher/tokens, token_balance); integration guide and in-app API docs
✅ **Other**: Usage & Payments enhancements; CourseContentGenerating; language normalization; API server exam schema/type import fix
✅ **Version & docs**: Release 0.14.0 (package, CHANGELOG, FEATURES, ROADMAP, API.md)

### Version 0.11.0 (February 2026)
✅ **Learning objectives**: Never skipped; extraction from content and raw response; required in prompt; first lesson in course fixed
✅ **Universal language codes**: 2-letter codes (en, az, ru, …) for lessons/courses; flags display correctly; config helpers `normalizeLanguageCode` / `getLanguageNameForPrompt`
✅ **Course deletion**: User alert when delete blocked (lesson or exam in class); message: "A lesson or exam from this course was added to a class. Remove it from the class first, then try again."
✅ **Final exams, document upload, exam/lesson deletion**: Ownership verification; lesson content normalization and rendering
✅ **Version & docs**: Release 0.11.0 (package, CHANGELOG, README, FEATURES, ROADMAP, API.md)

### Version 0.11.2 (February 2026)
✅ **Course-generated vs standalone split**: `course_generated` on lessons and exams; course-generated items visible only inside the course; removed Manual/From course badges and source filter
✅ **Version & docs**: Release 0.11.2 (package, CHANGELOG)

### Version 0.12.0 (February 2026)
✅ **Multi-document course generation**: Structure and lessons use all selected documents (lesson 1 → doc 1, etc.); final exam uses all lesson content; `source_documents` array
✅ **Course generation log**: Optional `generation_log` (steps, timing, per-lesson success/failure)
✅ **TTS retry**: Audio retries on 5xx with backoff
✅ **Multi-document lesson generation**: Multi-select documents on "Generate AI Lesson"; RAG from all selected docs
✅ **Course-generated visibility**: Dashboard and reports exclude course-generated lessons from counts
✅ **Version & docs**: Release 0.12.0 (package, CHANGELOG, API)

> **Note**: For detailed information on completed features, see [FEATURES.md](./FEATURES.md). For what to update when releasing, see [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md).

---

## 🚀 Planned versions (future)

*The sections below describe **future** product goals. Version numbers are targets and may shift.*

---

## 🧪 Version 2.1.0 - AI Quality Assurance & Reliability

**Target Release**: Q2 2026  
**Status**: 🔵 **PLANNED**

### Prompt and output quality controls
- [ ] **Prompt QA test suite**: Add regression checks for banned filler/meta phrases and low-value explanation patterns.
- [ ] **Output validation pipeline**: Add post-generation checks for explanation clarity, topic adherence, and format quality.
- [ ] **Quality telemetry**: Capture generation-quality signals (retry rates, sanitization hits, malformed output rates).

### Authoring reliability
- [ ] **Mermaid quality upgrades**: Expand auto-repair and fallback behavior for malformed diagram blocks.
- [ ] **Exam contract robustness**: Add stricter validation when requested topic distribution and generated output diverge.

---

## ⚡ Version 2.2.0 - Teacher Workflow Acceleration

**Target Release**: Q3 2026  
**Status**: 🔵 **PLANNED**

### Course/exam authoring productivity
- [ ] **Reusable generation presets**: Save and re-apply preferred lesson/exam settings per teacher/class.
- [ ] **Draft review workspace**: Side-by-side review for generated lesson/exam content with quick approve/regenerate actions.
- [ ] **Batch content actions**: Multi-select publish/unpublish/share flows for lessons and exams.

### Classroom operations
- [ ] **Calendar scheduling shortcuts**: Faster weekly planning with reusable class templates.
- [ ] **Class-level quality defaults**: Default language, grade, difficulty, and explanation style preferences per class.

---

## 🔒 Version 2.3.0 - Security, Compliance, and Platform Trust

**Target Release**: Q4 2026  
**Status**: 🔵 **PLANNED**

### Security and governance
- [ ] **Audit trail enhancements**: More complete event logs for sensitive teacher/admin actions.
- [ ] **Access hardening**: Expanded role-scoped checks and secure defaults on high-risk endpoints.
- [ ] **Operational monitoring**: Better incident visibility for AI, auth, and content-generation failures.

### Compliance readiness
- [ ] **Data lifecycle controls**: Export/delete and retention tooling for core education data.
- [ ] **Policy transparency**: Improved admin-facing visibility for privacy and content governance settings.

---

## 🎯 Success Metrics

### Current Release Goals (v2.1.0)
- 150+ active teachers using reports monthly
- 70%+ teacher report sessions use filters or drilldowns
- 30%+ reduction in time-to-intervention from class view to student insight
- zero critical regressions in reporting/class drilldown navigation

### Long-term Goals
- 1,000+ organizations
- 100,000+ active users
- teacher reporting used weekly by 60%+ of active teachers
- measurable learning intervention lift from data-driven class workflows

---

## 📝 Notes

- **Versioning**: Semantic Versioning (MAJOR.MINOR.PATCH)
- **Release Cycle**: Milestone-based; version numbers follow delivered scope, not fixed calendar cadence
- **Feedback**: User feedback drives feature prioritization
- **Flexibility**: Roadmap subject to change based on user needs

---

**Last Updated**: April 2026 (v2.1.0 current)  
**Next Review**: May 2026
