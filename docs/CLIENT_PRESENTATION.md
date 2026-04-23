# Eduator AI — For New Clients

**Audience:** Decision-makers, school/university leads, procurement.  
**Purpose:** Why Eduator AI — outcomes, differentiators, and proof points.  
*Not a feature checklist; focus on value and fit.*

---

## What You Get

**One platform where:**

- **Teachers** turn existing materials (PDFs, docs) into exams, lessons, and full courses in minutes — with AI handling structure, questions, images, and narration. No need to copy-paste into separate tools or rebuild content from scratch.
- **Admins** run their organization via natural language: “How many students in Class 10?” or “Create a class and assign teacher X” — no hunting through menus or training on complex dashboards.
- **Students** get 24/7 AI tutoring aligned to their curriculum and teacher-assigned content, in multiple languages, so support scales without scaling staff.

**Outcome:** Less time on prep and admin, more time on teaching and higher-quality, scalable content. Curriculum stays under your control because AI uses your documents, not generic templates.

---

## Why Eduator AI (Differentiators)

### 1. From Documents to Ready-to-Use Content

**What it means:**

- Upload PDFs or text → AI generates **exams** (multiple choice, true/false, short answer, fill-in-the-blank) with answer keys and difficulty levels. You can edit, translate, and assign in one flow.
- Same documents → AI generates **lessons** with rich HTML, images (Google Imagen), and audio narration (TTS). Optional mini-quizzes and examples. Audio can be regenerated without recreating the whole lesson.
- **Full courses:** Select documents → AI designs a multi-lesson course (blueprint, order, topics) and a final exam. One flow from “your materials” to “ready to schedule.” You can lock in lesson topics and exam settings (question count, types, difficulty) so output matches your standards.

**Why it matters:** Content stays **on your curriculum**. RAG (Retrieval Augmented Generation) uses your documents so exams and lessons reflect what you teach, not generic web content. Same content can be generated or translated into 8+ languages (English, Azerbaijani, Russian, Turkish, German, French, Spanish, Arabic) without redoing work.

**Proof point:** Document-to-course in one flow — from PDFs to a full course with lessons and final exam, with optional topics and difficulty. No separate authoring tool for structure; the AI handles ordering and pedagogy.

---

### 2. Admin by Conversation

**What it means:**

- Platform and school admins use an **AI agent** in natural language. Ask questions: “List pending approvals,” “How many students per class?” Get reports and insights without building custom dashboards.
- Give instructions: “Create organization X and add admin Y,” “Create a class and assign teacher Z.” The agent executes safe, predefined actions (create user, class, organization) with real-time progress (pending → executing → completed per step).
- **Two modes:** “Think” for queries only (read-only); “Agent” for safe administrative actions. Reduces clicks and training time for new staff and makes it easy to ask in your language (e.g. Azerbaijani, Russian, English).

**Why it matters:** Admins spend less time in menus and more time on decisions. New staff can be productive faster. 200+ example queries are documented so you can train people on what to ask and how to phrase it.

**Proof point:** Admin by language — admins can ask in their language and get results or actions. Safety by design: read-only vs action modes; database access is SELECT-only; write operations go through fixed tools, not free-form SQL.

---

### 3. One AI Tutor, Your Content

**What it means:**

- Students use an **AI tutor** (EduBot) that knows their **teacher-assigned documents** and grade level. Answers and explanations are grounded in your curriculum, not random web knowledge.
- Socratic-style help: step-by-step explanations, checks for understanding, and real-world connections. Teachers can share tutor conversations with a class so the assistant is consistent with what’s taught in the classroom.
- **8+ languages** with automatic detection and response, so multilingual student bodies get support in their preferred language.

**Why it matters:** 24/7 support without scaling human tutors. Students get consistent, curriculum-aligned help; teachers see what the tutor is teaching so they can align classroom and homework.

**Proof point:** RAG everywhere — exams, lessons, courses, and both EduBots (teacher assistant and student tutor) use your documents so outputs are curriculum-aligned.

---

### 4. Schedule Like a Pro

**What it means:**

- **Smart Calendar Hub:** Draft exams and lessons live in a sidebar. Teachers **drag and drop** them onto a weekly calendar and assign a class. Reschedule by dragging events. No separate scheduling tool.
- See **who’s active** (e.g. “18/25 students”) on each event when enrollment and activity data are available. One view for the week, fewer missed assignments and less back-and-forth.

**Why it matters:** One place for “what’s ready” and “when it runs.” Teachers and admins see the same timeline; students get a clear schedule. Optimized for many classes (50+) and many events (100+).

---

### 5. Built for Schools and Scale

**What it means:**

- **Multi-tenant:** Each organization (school/university) is isolated. Roles (platform owner, school admin, teacher, student) and permissions are clear. Row-Level Security (RLS) in the database ensures tenants only see their own data.
- **Multi-language:** Generate and translate exams and lessons; same content, multiple languages, without redoing work. Supports 8+ languages today.
- **Modern stack:** Fast, responsive apps; REST API and OpenAPI docs at `/docs` for IT teams and future integrations (e.g. LMS, SIS). JWT auth, rate limiting, and structured errors so integration is predictable.

**Why it matters:** You can scale to many schools and many languages on one platform. IT gets a clear security and integration story; procurement gets a roadmap (exam taking, progress tracking, question banks, analytics, LMS integrations).

---

## Who It’s For

| Role | Main benefit |
|------|----------------|
| **Schools / universities** | Scale content and support without scaling headcount; one platform for creation, delivery, and tutoring. |
| **Curriculum / academic leads** | Keep control: AI uses your documents and settings; you approve what gets published. |
| **IT / ops** | Clear roles, security (RLS, JWT), API and Swagger for integration and compliance. |
| **Teachers** | Less prep time; more time for teaching and differentiation; AI assistant for planning and exams; calendar and course run in one place. |
| **Students** | 24/7 tutor tied to their materials and language; self-paced courses with clear structure. |

---

## Use Cases & Scenarios

**New curriculum rollout:** Upload new textbooks or standards docs → generate lesson sets and exams → translate to required languages → assign to classes and schedule on the calendar. One pipeline instead of hand-building in multiple tools.

**Multilingual student body:** Same exam or lesson in 8+ languages; students (and the AI tutor) work in their preferred language. No duplicate authoring.

**Admin efficiency:** “How many pending approvals?” “Create a class for Grade 10 and assign Ms. Smith.” Answers and actions in seconds, with progress visible for multi-step requests.

**Teacher prep time:** Turn a chapter PDF into a lesson with images and audio, or into a full course with a final exam. Edit and refine in the same UI; share with classes and schedule from the calendar.

**Student support at scale:** AI tutor available 24/7, grounded in teacher-assigned documents and grade level. Teachers can review and share tutor conversations with the class for consistency.

---

## Proof Points to Use in Conversations

- **Document-to-course in one flow** — from PDFs to a full course with lessons and final exam, with optional topics and difficulty. No separate course-authoring tool required.
- **Admin by language** — 200+ example queries documented; admins can ask in their language and get results or actions. Think vs Agent modes keep read-only and write operations clear and safe.
- **RAG everywhere** — exams, lessons, courses, and both EduBots use your documents so outputs are curriculum-aligned, not generic.
- **Safety by design** — read-only vs action modes for the agent; SELECT-only for database queries; RLS so tenants only see their data; fixed tools for create/update, no free-form SQL.
- **Roadmap** — exam taking, results and feedback, progress tracking, question banks, analytics, LMS integrations, and more are planned; you can reference a clear direction and timeline (e.g. Q2–Q3 2026 for student portal and analytics).

---

## What’s Coming (Roadmap Summary)

- **Student portal & exam taking:** View exams, timer-based interface, submit answers, immediate results and feedback, performance breakdown.
- **Progress tracking:** Student performance dashboard, exam history, class progress; teacher view of individual and class statistics.
- **Question bank:** Reusable question banks, topic tagging, difficulty management, bulk import/export.
- **Analytics & communication:** Teacher and student analytics, notifications, messaging, class announcements.
- **AI agent expansion:** Agent for teachers (scoped to their classes) and students (personal data queries); conversation memory; batch operations.
- **Integrations:** LMS (Google Classroom, Canvas, Moodle, Blackboard); third-party storage (Google Drive, Dropbox); enterprise (SSO, advanced reporting, white-labeling).

You can use this roadmap to align with procurement and IT on timelines and future capabilities.

---

## Next Steps for New Clients

1. **Demo:** Walk through document → exam, document → lesson, document → course; show admin-by-chat (Think and Agent modes); show calendar (drafts, drag-and-drop, class assignment); show student tutor with document context and language.
2. **Pilot:** One organization or department — upload real materials, generate exams/lessons/courses, try the agent and calendar with real admins and teachers. Collect feedback on workflows and languages.
3. **Technical review:** Share [TECHNICAL_HIGHLIGHTS.md](./TECHNICAL_HIGHLIGHTS.md) and API docs (`/docs`) with your IT; align on auth (JWT, Supabase), hosting, and integration (REST, future LMS).
4. **Plan rollout:** By role (e.g. teachers first, then students); by language and course type; by school or region if multi-tenant. Use the roadmap to set expectations for exam taking, progress, and analytics.

---

*For technical evaluators use [TECHNICAL_HIGHLIGHTS.md](./TECHNICAL_HIGHLIGHTS.md). For full feature lists see [FEATURES.md](./FEATURES.md); for roadmap see [ROADMAP.md](./ROADMAP.md).*

**Document applies to:** v0.11.0 · **Last updated:** February 2026
