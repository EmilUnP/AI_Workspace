# Changelog

All notable changes to Eduator AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Releases are listed newest first** (2.1.0 → 2.0.0 → 1.0.5 → 1.0.4 → 1.0.3 → 1.0.2 → 1.0.1 → 1.0.0 → 0.18.0 → 0.17.31 → 0.17.30 → 0.17.26 → 0.17.25 → 0.17.16 → 0.17.14 → 0.17.13 → 0.17.12 → 0.17.11 → 0.17.10 → 0.17.9 → 0.17.7 → 0.17.5 → 0.17.0 → 0.16.0 → 0.15.0 → … → 0.1.0).

**When releasing:** Update CHANGELOG (this file), FEATURES.md, ROADMAP.md, and API.md as needed. See [docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) for the full release checklist and where to document what.

---

## [2.1.0] - 2026-04-21

### 🔧 Changed

- Unified workspace and product versioning to `2.1.0` across root, apps, and all internal packages.
- Updated API-exposed product version constant to `2.1.0` for health/docs/version consistency.

### 📚 Documentation & technical

- Updated release-facing documentation labels and badges to `2.1.0` in README and docs (`API`, `FEATURES`, `ROADMAP`).
- Synced lockfile workspace package versions with the 2.1.0 release.

---

## [2.0.0] - 2026-04-16

### ✨ Added

- **Teacher reporting intelligence (ERP)**:
  - Added filter-driven reporting with class filter and flexible date-window controls.
  - Added class and student drilldown reporting routes:
    - `/teacher/reports/classes/[id]`
    - `/teacher/reports/students/[id]`
  - Added insight actions and period-over-period delta presentation for key reporting metrics.
- **Class-to-report workflow continuity**:
  - Connected class detail reporting and students workflows to contextual student/class report drilldowns.
  - Added direct report entry points from enrolled student cards for faster intervention flow.
- **Reporting data foundation**:
  - Added `activity_events` schema and `reporting_snapshots_mv` materialized view foundation SQL for future engagement analytics.

### 🔧 Changed

- **Teacher reports UX**:
  - Upgraded main reports page and all tabs with a premium dashboard hierarchy and clearer action flow.
  - Improved class and student drilldown pages with stronger summaries, trend blocks, and cleaner CTA structure.
  - Simplified report navigation to four tabs (`overview`, `exams`, `lessons`, `classes`) by removing the low-value students aggregate tab.
  - Replaced preset-only report period controls with explicit `startDate` + `endDate` filtering (default: current month).
  - Removed draft/published content-state filtering to reduce noise and focus on high-value controls.
  - Reworked Activity Trend rendering and adaptive bucketing to eliminate period-switch freezes and improve readability across short and long ranges.
- **Teacher class detail UX (`/teacher/classes/[id]`)**:
  - Upgraded students and reporting tab experience with quick analytics actions, context counts, and management-center style layout.
- **Error handling hardening (ERP + ERP)**:
  - Sanitized app/global error boundary payloads before rendering to avoid runtime formatter issues in Next.js 15 (`frame.join` class errors).
- **Infrastructure direction**:
  - Release baseline aligns with a major operational shift from a simple Vercel-only profile toward a fuller real-server deployment model and expanded backend capabilities.

### 📚 Documentation & technical

- Updated release documentation for `2.0.0` across README/FEATURES/ROADMAP/API/changelog and manager report references.
- **Version**: 2.0.0 (root package and lockfile).

---

## [1.0.5] - 2026-03-17

### ✨ Added

- **Final exam randomized pool mode (ERP + ERP)**:
  - Added a second final-exam strategy: `random_pool` in addition to fixed selection.
  - Teachers/admins can now select a large pool of questions and define `questions_per_attempt` (e.g. pool 100, show 30).
  - Each student receives a randomized non-duplicate subset from the selected pool.
- **Final exam question-selection UX improvements**:
  - Source-exam question action now toggles between **Select all** and **Unselect all**.
  - Final exam list/detail pages now display **Question mode** and **Questions per attempt** for quick visibility.
- **Final exam DB support**:
  - Added migration for `final_exams.question_mode` and `final_exams.questions_per_attempt` with constraints and defaults.

### 🔧 Changed

- **Student final exam delivery/scoring consistency**:
  - Student exam detail now applies final-exam mode/selection before rendering questions.
  - Scoring and results now evaluate only the effective question set for that student attempt (including randomized pools), preventing full-exam scoring mismatch.
- **Exam creator edit flow**:
  - Added editable exam title control in post-generation/edit state so title can be changed after AI generation.

### 📚 Documentation & technical

- Updated release documentation for `1.0.5` across README/FEATURES/ROADMAP/API/changelog.
- **Version**: 1.0.5 (root package and lockfile).

---

## [1.0.4] - 2026-03-17

### 🔧 Changed

- **AI prompt engineering quality hardening across generation flows**:
  - Strengthened exam, lesson, question, course, education-plan, and chatbot prompts to enforce direct, student-facing educational tone.
  - Added explicit anti-filler guidance to avoid low-value source-referencing intros (for example, "According to the text..."-style lead-ins in any language).
  - Improved mini-test and exam explanation standards so outputs are shorter, clearer, and pedagogically useful.
- **Post-generation explanation cleanup**:
  - Added/expanded explanation sanitization in AI services to strip meta/filler prefixes when models still produce them.
  - Fallback explanation phrasing was refined to be professional and classroom-appropriate.
- **Roadmap quality refresh**:
  - Reworked future roadmap sections to remove outdated placeholders and align upcoming plans with current product priorities.

### 📚 Documentation & technical

- Updated release documentation for `1.0.4` across README/FEATURES/ROADMAP/API/changelog.
- **Version**: 1.0.4 (root package and lockfile).

---

## [1.0.3] - 2026-03-17

### ✨ Added

- **Lesson content diagram rendering hardening**:
  - Added Mermaid diagram support in lesson content rendering with client-side parsing.
  - Added Mermaid normalization/repair passes for common AI output errors (broken edge lines, malformed labels, punctuation cleanup).

### 🔧 Changed

- **Exam generation contract accuracy**:
  - Topic input parsing now supports robust array/string handling.
  - Topic-based question limits are enforced more strictly after generation.
  - Exam titles are cleaned/sanitized and generation UI now exposes clearer title behavior.
- **Exam and course generation UX refresh (ERP + ERP)**:
  - Reworked final exam settings in course creation to match exam-creator clarity.
  - Added compact collapsible sections for lesson options and final exam settings to reduce vertical noise.
  - Upgraded slider controls (question type/difficulty) with balanced percentage logic and clearer visual summaries.
  - Improved stepper and settings summaries for faster scanning.
- **UI slider visual consistency**:
  - Replaced inconsistent native range styling with unified filled-track + thumb visuals in both course-create and exam-creator.

### 📚 Documentation & technical

- Updated release documentation for this version in `CHANGELOG.md` and `docs/FEATURES.md`.
- **Version**: 1.0.3 (root package and lockfile).

---

## [1.0.1] - 2026-03-16

### ✨ Added

- **Cross-app URL helpers**:
  - `apps/erp-app/src/lib/portal-urls.ts` for `app`, `erp`, and `api` URLs.
  - `apps/erp-app/src/lib/marketing-url.ts` for centralized marketing URL routing.

### 🔧 Changed

- **ERP landing routing**: Updated landing CTAs and public header/footer auth links to use explicit portal URLs (`app`, `erp`, `api`) instead of local-only relative links.
- **ERP route strategy cleanup**:
  - Removed duplicated ERP marketing pages: `/`, `/about`, `/pricing`, `/services`.
  - ERP root (`/`) now redirects to `/auth/login`.
  - ERP `/about`, `/pricing`, `/services` redirect to main marketing domain via `NEXT_PUBLIC_MARKETING_URL`.
- **ERP navigation/footer links**: Updated to point directly to marketing URLs (no dead internal paths).
- **ERP middleware cleanup**: Removed obsolete public-route entries for `/about`, `/services`, `/pricing`.
- **ERP i18n cleanup**: Removed unused `home`, `about`, `services`, `pricing` namespaces from `apps/erp-app/src/messages/public/{en,az,ru}.json`.

### 📚 Documentation & technical

- Added release notes for both `1.0.1` and `1.0.0` in this changelog and synchronized README release summary.
- **Version**: 1.0.1 (root, apps, and packages).

---

## [1.0.0] - 2026-03-16

### 💥 Breaking / major changes

- **Platform rebrand**: Renamed product/domain references from `EduSpace` / `eduspace.ai` to `Eduator` / `eduator.ai` across apps, packages, scripts, and docs.
- **Package scope migration**: Updated workspace package names/imports to `@eduator/*`.

### 🔧 Changed

- **Release baseline**: Bumped workspace versions to `1.0.0` to establish stable release baseline.
- **Monorepo ESLint stability**:
  - Configured Next.js root dirs for multi-app linting.
  - Expanded ignore globs to exclude generated `dist`/`.next` outputs in nested workspaces.
- **Workspace runtime alignment**:
  - Re-linked workspace dependencies after scope rename.
  - Rebuilt package outputs (notably DB dist) to remove stale `@eduspace/*` references.

### 📚 Documentation & technical

- Updated project docs and references to reflect new branding and domain.

---

## [0.18.0] - 2026-03-01

### ✨ Added

#### **Student profile full i18n (ERP + ERP)**
- **Student exams** (`/student/exams`): List, take exam, and results pages fully translated. Namespaces `studentExams`, `studentExamTake`, `studentExamResults`. Final exam description and passing message; question type labels (multiple choice, true/false, multiple select, fill blank). Template strings with placeholders passed as raw messages from `getMessages()` and interpolated on the client to avoid next-intl FORMATTING_ERROR. Back “to My Courses” when coming from course run.
- **Student classes** (`/student/classes`): List and class detail fully translated. `StudentClassesList` and `StudentClassDetailClient` accept `labels`; namespaces `studentClasses`, `studentClassDetail` (en, ru, az in both apps).
- **Student calendar** (`/student/calendar`): Full translation via `studentCalendar` namespace. Section labels (available now, upcoming, past, min, draft), empty states, and hints with embedded links. ERP and ERP.
- **My Courses (ERP)** (`/student/courses`, certificate, course run): `studentCourses`, `studentCourseCertificate`, `studentCourseRun`, `studentLessonDetail` namespaces. Course list, join form, progress labels, certificate view, and course run (tabs, lesson content, final exam CTA) all translated. `CourseRunClient` uses `useStudentTranslations` prop so student run loads student namespaces; `StudentRunWrapper` passes it.
- **Student assistant (FAB + drawer)**: Full translation of the study assistant panel. Namespace `studentAssistant` (en, ru, az). Step tabs (Today, Exams, Lessons, Updates, Progress), today activity cards, upcoming exams, lessons, class updates, progress & scores, achievements, and chat panel (prompt suggestions, placeholder). `StudentAssistantFab` and `StudentAssistantClient` accept `labels`; layout builds `assistantLabels` from `getTranslations('studentAssistant')` and raw templates from `getMessages()` for keys with placeholders (`completedToday`, `takenToday`, `youHaveUpcoming`, `minTotal`, `dayStreak`, `newInClass`, `newUpdate`) to avoid FORMATTING_ERROR. Client wrapper `StudentAssistantFabWrapper` uses `useTranslations('studentAssistant')` for FAB button `title` and `aria-label` so they update with locale without full reload.

### 🔧 Changed

- **Student layout (ERP + ERP)**: Fetches `getMessages()` in addition to `getTranslations('studentAssistant')`; template keys for assistant labels use raw message strings from `messages.studentAssistant` with English fallbacks so `t()` is never called with missing placeholder variables.
- **UI exports**: `StudentAssistantLabels` exported from `@eduator/ui` for type-safe label passing.

### 📚 Documentation & technical

- **Version**: 0.18.0 (root and api-server `package.json`).

---

## [0.17.30] - 2026-03-01

### ✨ Added

#### **Student join class by code + teacher confirmation (ERP)**
- **Join by code → pending**: Students who join with the class code get `status: 'pending'` (not active). They see a “Pending approval” section and message “Request sent. You will have access once the teacher approves.”
- **Pending join requests (teacher)**: Class detail page shows “Pending join requests” with Confirm / Reject per student. `confirmEnrollment` sets status to `active`; `rejectEnrollment` deletes the enrollment.
- **Confirm student only**: “Add students” dialog removed; students enter the class only by joining with the code and being confirmed by the teacher. Empty-state hint: “Students join using the class code; confirm them in the Pending join requests section above.”
- **Remove student**: Teacher can remove an enrolled student from the class. `removeStudentFromClass` server action; Enrolled Students section is a client list with a “Remove” button per student. Labels `removeStudent`, `removingStudent` (en, ru, az).
- **Core**: `getPendingClasses(supabase, studentId)` in `@eduator/core/utils/student-classes` for pending enrollments. Student classes page fetches and displays pending classes (no link to class content until confirmed).
- **UI**: `StudentClassesList` accepts `pendingClasses` and optional `labels`; “Pending approval” block and join-success message. `EnrolledStudentsSection` and `PendingEnrollmentsSection` client components (ERP teacher class detail).

### 🔧 Changed

- **Teacher class detail (ERP)**: Enrolled Students is read-only list + Remove; no EnrollStudentDialog. `enrollLabels` removed from page; `noStudentsHintConfirm` used for empty state.
- **Teacher enroll flow**: If teacher adds a student via search (if re-added later) and that student already has a pending request, the action updates the enrollment to `active` instead of erroring.

### 📚 Documentation & technical

- **DB migration**: `supabase/migrations/20260301000000_add_pending_to_class_enrollments_status.sql` adds `'pending'` to `class_enrollments_status_check`. Run in Supabase SQL Editor if you see the check constraint error. `supabase/README.md` documents how to run it.
- **Schema doc**: `packages/agent/src/prompts/database-schema.ts` updated: `class_enrollments.status` includes `'pending'`.
- **Version**: 0.17.30 (root and api-server `package.json`).

---

## [0.17.26] - 2026-03-01

### ✨ Added

#### **Teacher calendar: weekly navigation and usability**
- **Weekly navigation**: Calendar respects viewed week; Previous/Next week and Today work. `CalendarClient` (ERP + ERP) keeps `viewDate` state and passes `currentDate` and `onDateChange` to `TeacherCalendarHub`. Header shows “Today ·” only when the displayed week is the current week.
- **Final exams on calendar**: Scheduled final exams (`final_exams` table) created by the teacher appear on the calendar. Both apps fetch final exams in `getScheduledEvents` and map them to `CalendarEvent` with `isFinalExam: true`.
- **Final exam styling**: Final exams use amber/orange color (regular exams stay violet). `CalendarEvent.isFinalExam`; legend in calendar header: Exam (violet), Final exam (amber), Lesson (emerald). Label `typeFinalExam` in both apps (en, ru, az).
- **Confirm & publish week**: Single action to confirm/publish all draft events for the viewed week. Button moved to the main top bar (TeacherCalendarHub), next to AI Pulse. Hub computes `draftEventIdsInWeek` from `events` and `currentDate`; `onConfirmWeek` runs per-event confirm then refresh.
- **Unpublish (revert to draft)**: Unpublish action for published events. Server actions `unpublishMaterial` (ERP + ERP); Quick Edit Panel shows “Unpublish (revert to draft)” for published events. Labels `unpublish`, `reverting`; hub `onUnpublishEvent`, calendar clients call `unpublishMaterial` then refresh.

### 🔧 Changed

#### **Teacher calendar**
- **Refresh after mutations**: All calendar mutations (schedule, update, delete, confirm week, unpublish) use `startTransition(() => router.refresh())` and server actions use `revalidatePath('/teacher/calendar', 'layout')` so the UI updates without manual refresh.
- **Per-event Confirm & publish removed**: Quick Edit Panel no longer has a per-event “Confirm & publish” button; publishing is done via the weekly “Confirm & publish week” button in the top bar.
- **Confirm week button location**: “Confirm & publish week” moved from SmartCalendar header into TeacherCalendarHub top bar (same row as Calendar title, class filter, AI Pulse).
- **Quick Stats removed**: The top-bar stats block (Exams count, Lessons count, Classes count) was removed from the calendar page.

### 📚 Documentation & technical

- **Version**: 0.17.26 (root and api-server `package.json`).

---

## [0.17.25] - 2026-02-25

### ✨ Added

#### **Teacher calendar full i18n (ERP + ERP)**
- **Calendar Hub** (`/teacher/calendar`): All UI strings use `teacherCalendar` namespace — page title, scheduled/drafts subtitle, class filter (All Classes, Your Classes, search placeholder, event counts), stats (Exams, Lessons, Classes), AI Active badge, schedule material dialog (Select Class, Start/End time, Cancel, Schedule, tip for class filter). Labels passed from server page via `CalendarClient` to `TeacherCalendarHub`.
- **Materials Library (DraftsSidebar)**: Header, items total, Target badge, All/Exams/Lessons filter pills, search placeholder, empty states (no materials / try different search / create exams or lessons), “Showing X of Y”, “Drag to calendar”, Load more, footer drag hint. `DraftsSidebarLabels` with defaults; hub passes labels from `teacherCalendar`.
- **Quick Edit Panel**: Edit Event title, Update schedule details, Published/Unused/Scheduled badges, Title/Class/Start Time/End Time labels, Confirm & publish, Save Changes, Delete Event, delete confirmation. `QuickEditPanelLabels`; labels from hub.
- **SmartCalendar**: Day names (Mon–Sun), Previous/Next week tooltips, Today button, week event count (“X event(s)”), view toggle (24h / Working hours, Show all 24 hours), Exam/Lesson legend, event type labels (Exam, Lesson, Doc, Item) and Unused tooltip on draft events. `SmartCalendarLabels`; hub builds `dayNames` array and passes full label set.
- **Message files**: New `teacherCalendar` keys in both apps (ERP + ERP) for en, az, ru. Server pages build `calendarLabels` with placeholder-safe `t()` for ICU strings; “Unknown Class” fallback translated on the server.

#### **Teacher classes full i18n (ERP + ERP)**
- **List, create, detail** (`/teacher/classes`, create flow, `/teacher/classes/[id]`): `teacherClasses` namespace used for list and detail. Copy class code button tooltip translated.
- **Share dialogs**: Share Exam, Share Document, Share Lesson — modal titles, subtitles, search placeholders, empty states, select all/selected, share/scheduling buttons, success messages. Shared content list: section titles, counts, empty states, remove confirmation (type-specific title/message), Keep/Remove, view/open/remove actions, Published/Draft. All via `labels` prop and message keys in both apps.
- **Enroll students**: Add Students button, modal title/subtitle, filter by unit (ERP), search placeholders, loading/searching/no students states, students selected count, Select at least one, Adding/Add. `EnrollStudentDialogLabels`; ERP `EnrollStudentClient` forwards labels from server page.
- **AI Tutor section**: Title, descriptions (connected/not connected), fallback chat title, Last updated, Subject/Grade labels, document context (single/plural), Open Chat, Unlink, Create New Chat, Link Existing Chat, View All Chats, link modal (title, subtitle, empty state, Untitled Chat). `ClassAITutorLabels`; server page builds labels with placeholder-safe `t()` for plural messages.

#### **Education plans i18n and UX (ERP + ERP)**
- **Create / detail / edit** (`/teacher/education-plans/create`, `[id]`, `[id]/edit`): Full translation of form sections (Basics, plan content), placeholders, audience selector (dropdown), week title placeholder with ICU-safe `{week}`. Plan content hint, topics/objectives per line labels.

### 🔧 Changed

#### **Calendar drafts sidebar**
- **Removed Live/Unused badge**: The status badge (“✓ Live” / “○ Unused”) on each draft item in the Materials Library sidebar has been removed. Draft items now show only title, question count (exams), and duration where applicable.

### 📚 Documentation & technical

- **Version**: 0.17.25 (root and api-server `package.json`).
- **Label types exported**: `TeacherCalendarHubLabels`, `ShareExamDialogLabels`, `ShareDocumentDialogLabels`, `ShareLessonDialogLabels`, `SharedContentListLabels`, `EnrollStudentDialogLabels`, `ClassAITutorLabels` from `@eduator/ui` for type-safe label passing from server pages.

---

## [0.17.16] - 2026-02-28

### ✨ Added

#### **Path-based i18n message splitting (ERP + ERP)**
- **Module mapping**: Each app has `src/i18n/module-mapping.ts` mapping pathname → message module (public | teacher | student; ERP also platform-owner | school-admin). Enables loading only the messages needed for the current route.
- **Split message folders**: Translations live in `src/messages/<module>/` (e.g. `public/`, `teacher/`, `student/`) with `en.json`, `az.json`, `ru.json` per module. ERP: public, teacher, student. ERP: public, teacher, student, platform-owner, school-admin (separate profiles).
- **Middleware `x-pathname` header**: Both apps set request header `x-pathname` so the server knows the current path; ERP middleware sets it on all pass-through responses; ERP wrapper around `createAuthMiddleware` sets it for non-redirect responses.
- **Path-based dynamic imports**: `i18n/request.ts` reads `x-pathname`, resolves module via `getMessageModule(pathname)`, and dynamically imports `messages/<module>/<locale>.json`. For non-public modules, public messages are merged in so shared keys (e.g. `common`) are available.
- **Shared constant**: `X_PATHNAME_HEADER` in `i18n/constants.ts` (both apps); middleware and request use it for the header name.

### 🧹 Removed / Cleaned

- **Root message files**: Removed `messages/en.json`, `messages/az.json`, `messages/ru.json` from both ERP and ERP; the app loads only from the split folders.
- **Split scripts**: Removed `scripts/split-messages.js` from both apps; translations are edited directly in `messages/<module>/<locale>.json`. Empty `scripts/` directories removed.
- **ERP admin messages**: ERP has no admin UI (platform owner / school admin use ERP); removed unused `messages/admin/` and any admin module from ERP mapping.
- **ERP admin folder**: Replaced single `admin` module with separate `platform-owner` and `school-admin` message modules; removed obsolete `messages/admin/`.

### 📚 Documentation & technical

- **Messages README**: Added `src/messages/README.md` in both apps describing the folder layout (public, teacher, student; ERP also platform-owner, school-admin) and pointing to `i18n/module-mapping.ts`.
- **Version**: 0.17.16 (update root and app `package.json` when releasing).

---

## [0.17.14] - 2026-02-25

### ✨ Added

#### **Teacher final exams full i18n (ERP)**
- **List** (`/teacher/final-exams`): All labels passed from `teacherFinalExams` — page title/description, create button, empty state (noFinalExams, getStartedHint), filter/view/edit/duration/source(s), one attempt, results hidden/shown, release results. `FinalExamList` uses `defaultTitle` for card titles when no title set.
- **Create** (`/teacher/final-exams/create`): Full `teacherFinalExamCreate` namespace — section titles (source exams & questions, settings), form labels, placeholders, options (select class/exam/teacher), filter copy, errors, preview labels (heading, subheading, questions, duration, sources, one attempt, from prefix, default title). `FinalExamCreatePage` passes all labels and preview `defaultTitle` to `FinalExamPreview`.
- **Detail** (`/teacher/final-exams/[id]`): `teacherFinalExamDetail` — back/edit/delete/release, summary title/description, primary source, more sources (#N#), delete confirm, defaultTitle, source/sources. `FinalExamDetail` uses translated labels and locale-aware default title.
- **Edit** (`/teacher/final-exams/[id]/edit`): Full `teacherFinalExamEdit` — same shape as create where relevant, plus save/saving/cancel, selectTeacher, previewDefaultTitle. All hardcoded strings in `FinalExamEditPage` replaced with label props.

### 🐛 Fixed

#### **Final exam preview default title not translated**
- **FinalExamPreview**: Added `defaultTitle` to labels; when `title` is empty or exactly the English `"Final exam"`, the component now shows `t.defaultTitle` (e.g. "Yekun imtahan", "Итоговый экзамен") instead of the hardcoded "Final exam".
- **Create/Edit pages**: Preview title fallback changed from `'Final exam'` to `''` so the preview receives an empty title and applies the translated default; also handles the case when a source exam title is the literal "Final exam".

### 📚 Documentation & technical

- **Version**: 0.17.14 (root and api-server `package.json`).

---

## [0.17.13] - 2026-02-25

### ✨ Added

#### **Exam detail page (`/teacher/exams/[id]`) full i18n**
- **ExamLanguageSelector (ERP + ERP)**: All UI strings now use `useTranslations('teacherExams')` — section title “Questions”, “filtered”/“total”, “Language:”, “(original)”, “Filter by Topic:”, “All”, “No questions in this exam”, question type badges (Multiple Choice, True/False, etc.), difficulty labels (Easy/Medium/Hard), “Previous”/“Next”, “Correct Answer:”, “Explanation:”, topic tooltip. Removed hardcoded labels; question type and difficulty labels built from `t()` in `useMemo`.
- **ExportExamCsvButton (ERP + ERP)**: Button label and tooltip use `t('exportToExcel')` and `t('exportToExcelTitle')`.
- **teacherExams new keys**: Added across all six message files (ERP + ERP × en/az/ru): `questionsHeader`, `filteredLabel`, `totalLabel`, `languageLabel`, `originalLabel`, `filterByTopic`, `noQuestionsInExam`, `multipleChoice`, `trueFalse`, `multipleSelect`, `fillBlank`, `difficultyEasy`, `difficultyMedium`, `difficultyHard`, `previous`, `next`, `correctAnswerLabel`, `explanationLabel`, `exportToExcel`, `exportToExcelTitle`, `topicLabel`.
- **Created date**: Exam detail page uses `getLocale()` and `toLocaleDateString(locale, ...)` so the “Created” date follows the active language.

#### **Exam creator / edit — “editable” label**
- **editableLabel**: Replaced hardcoded “(editable)” in the exam summary (e.g. “Minutes (editable)”) with `t.editableLabel`. Added `editableLabel` to `ExamCreatorTranslations`, defaults, and `teacherExamCreator` in all six message files (en: “editable”, az: “redaktə oluna bilər”, ru: “редактируемый”).

### 📚 Documentation & technical

- **Version**: 0.17.13 (root and api-server `package.json`).

---

## [0.17.12] - 2026-02-25

### ✨ Changed

#### **Exam generation first-step UX**
- **Questions Preview only after questions exist**: On create exam, the right-hand “Questions Preview” panel is hidden until there are questions. The first step shows only the left column (AI Generate card, After exam settings, Summary when applicable), so the flow is “generate with AI first, then preview/edit.”
- **Layout**: When questions list is empty, the grid is single-column (full width for the AI panel); after generation, the two-column layout appears with Questions Preview.
- Manual add and edit remain available in the right panel once questions exist.

### 🧹 Removed

- **Unused exam creator translations**: Removed `noQuestionsYet`, `noQuestionsHint`, `noQuestionsHintPrimary`, and `noQuestionsOrAddManually` from `ExamCreatorTranslations` and from all six message files (ERP + ERP × en/az/ru), since the empty-state block is no longer rendered.

### 📚 Documentation & technical

- **Version**: 0.17.12 (root and api-server `package.json`).

---

## [0.17.11] - 2026-02-25

### 🐛 Fixed

#### **i18n formatting and duplicate-key fixes**
- **Duplicate `teacherProfile` key (ERP)**: Renamed the second namespace to `teacherProfilePage` in `en.json`, `az.json`, `ru.json` so the teacher's own profile page and the public teacher profile view use separate keys; updated `/teacher/profile` page and `profile-tabs.tsx` to use `teacherProfilePage`.
- **Documents — `browse` placeholder**: `explorerBrowseToUpload` uses ICU `{browse}`; page now passes `t('explorerBrowseToUpload', { browse: t('uploadBrowseLabel') })` when building explorer translations so FORMATTING_ERROR is avoided.
- **Documents — delete confirm placeholder**: Replaced ICU `{title}` with literal placeholder `#TITLE#` in all message files and in `edit-document-dialog.tsx` (`.replace(/#TITLE#/g, document.title)`), avoiding MALFORMED_ARGUMENT and keeping runtime title substitution.
- **Teacher dashboard — numeric placeholders**: Replaced ICU `{n}` with literal `#N#` in teacherDashboard messages (nPublished, inNClasses, publishedExamsReady, activeStudents, documentsInLibrary, nQuestions, nDaysAgo) across all six message files (ERP + ERP × en/az/ru). Updated `teacher-dashboard-client.tsx` `plural()` and `formatDate()` to replace `#N#` so next-intl no longer requires the `n` variable and FORMATTING_ERROR is resolved.

### 📚 Documentation & technical

- **Version**: 0.17.11 (root and api-server `package.json`).

---

## [0.17.10] - 2026-02-25

### ✨ Added

#### **Full teacher panel internationalization (i18n Phase 2)**
- **Teacher navigation**: All sidebar navigation items (Dashboard, Teaching Studio, Documents, Exams, Lessons, Courses, AI Tutor, Calendar, Classes, Education Plans, Reports, Tokens, Settings, API Integration) now use `next-intl` server-side translations via `getTranslations('teacherNav')` in both ERP and ERP layouts.
- **Teacher pages translated**: All teacher-facing pages now use `useTranslations()` hooks with namespaced keys:
  - **Courses** (list + create wizard): Search, filters, stats, grade levels, difficulty labels, wizard steps, form fields, error/success messages.
  - **Lessons** (list + generate): Document selection, grade level selector, generation options, status messages, table headers.
  - **Exams** (list + create): Search, class filters, status badges, row actions (publish, delete, share), empty states.
  - **Final Exams** (ERP): Page titles, create flow, status messages.
  - **Documents**: Breadcrumb, title, subtitle.
  - **Education Plans**: Page headers, plan list, empty states.
  - **Tokens**: Balance display, usage table, transaction types (exam generation, lesson generation, course generation, AI chat, etc.).
  - **Chat / AI Tutor**: Breadcrumb, page title, subtitle.
  - **Teaching Studio**: Hub page with all tool cards.
  - **Settings**: Profile info, password change form, enterprise account notices, save/cancel actions.
  - **Profile** (ERP): Page layout and profile tabs.
- **Student pages translated**: Student layout and settings page use translated strings.
- **Platform owner / school admin**: Layout client components updated for i18n compatibility.

#### **Shared UI i18n architecture**
- **`TeacherSettingsTranslations` interface**: New typed interface (35+ keys) in `@eduator/ui` so the shared `TeacherSettingsClient` component accepts all labels as props instead of hardcoded English strings. Default English translations provided as fallback.
- **Teaching Studio Hub**: Accepts translated props for tool names and descriptions.

### 🔧 Changed

- **Message files expanded**: Added 400+ new translation keys per language file across all 6 files (ERP + ERP × en/az/ru), covering teacher navigation, tokens, documents, courses, lessons, exams, final exams, education plans, chat, teaching studio, settings, and student settings.
- **Hardcoded labels removed**: Grade level arrays (Grade 1–12, Undergraduate, Graduate, PhD), question type labels, difficulty levels, and transaction type labels are now translated at render time instead of using static English strings.
- **`packages/ui/src/index.ts`**: Updated exports for new translation interfaces.

### 📚 Documentation & technical

- **Version**: 0.17.10 (root and api-server `package.json`).
- **i18n coverage**: v0.17.5 covered public pages and post-login nav; v0.17.10 completes the teacher panel, student settings, and shared components — the app is now fully translatable end-to-end.

---

## [0.17.9] - 2026-02-26

### ✨ Added

- **Optimized RAG chunking and embeddings**: Large documents (1.5M+ chars) that previously timed out or hit Cloudflare 520/521 now process reliably. Chunk size increased from 2500 → 4000 chars (672 → ~420 chunks for a 1.5M char doc). Embedding dimensions reduced from 3072 → 768 via `outputDimensionality` (Google-recommended Matryoshka MRL). Combined payload shrinks from ~16.5 MB to ~2.6 MB, eliminating Supabase statement timeouts.
- **Batch embedding API**: `generateChunkEmbeddings()` now uses the Gemini `batchEmbedContents` REST endpoint (100 texts per request), reducing API round trips from ~134 to ~5 for large documents.
- **Fallback embeddings table**: New `document_chunk_embeddings` table (one row per chunk) for documents too large for the JSONB column. Includes retry logic (3 attempts with 2s delay) for transient Supabase/Cloudflare failures.
- **`EMBEDDING_DIMENSIONS` config**: Centralized in `AI_MODELS` constant for easy tuning.

### 🔧 Changed

- **Embedding generation**: Replaced deprecated `@google/generative-ai` SDK `embedContent()` with direct Gemini REST API calls (`fetch`), enabling `outputDimensionality: 768` without a full SDK migration.
- **Auth resilience**: Middleware, server auth, and login actions now catch `TypeError: Cannot create property 'user' on string` (Supabase returning non-JSON during outages) and degrade gracefully instead of crashing the app or logging users out.
- **Error logging**: Supabase 520/521 HTML responses are normalized to short messages instead of dumping full HTML pages into logs.

### 🐛 Fixed

- **Large document embedding save**: Documents with 600+ chunks no longer fail silently; embeddings are saved to fallback table with retries when main JSONB column update exceeds statement timeout.
- **Session crash on Supabase outage**: `TypeError: Cannot create property 'user' on string` no longer crashes middleware or forces logout; treated as temporary auth unavailability.

### 📚 Documentation & technical

- **Version**: 0.17.9 (root and api-server `package.json`).
- **Migration**: `20260226000000_create_document_chunk_embeddings.sql` — fallback per-chunk embeddings table.

---

## [1.0.2] - 2026-03-06

### ✨ Added

- **Auth language switchers**: Locale switcher added to ERP and ERP **login**, **signup**, and **forgot password** pages so users can always change language even when deep-linked directly to auth routes.
- **Back to main site links**: ERP and ERP auth pages now include explicit “Back to main site” links using `NEXT_PUBLIC_MARKETING_URL` / `NEXT_PUBLIC_APP_URL`, making it easy to return from subdomain login pages to the main marketing/landing domain.

### 🔧 Changed

- **Lesson length options**: Simplified and aligned lesson length presets across EN/AZ/RU and the AI prompt:
  - Short ≈ **1–2 pages**, Medium ≈ **3–4 pages**, Full ≈ **6–8 pages**, with updated word/section/example counts in `lesson-generator`.
  - UI labels and hints for **Lesson Length** in teacher lesson generation and course creation flows now match these ranges in all three languages.
- **ERP login layout**: ERP main login page now mirrors the ERP split layout (branding panel on the left, form on the right) while preserving ERP styling and translations.

---

## [0.17.7] - 2026-02-26

### ✨ Added

- **Turborepo**: Monorepo build and dev now use Turborepo for cached, dependency-aware builds. Root scripts `build`, `build:ERP`, `build:erp`, `build:api` and `dev:*` use `turbo run` with filters so only the target app and its workspace dependencies are built or run.
- **turbo-ignore**: Optional Vercel “Ignored Build Step” support — set `npx turbo-ignore` in each Vercel project so that project only builds when that app (or its dependencies) have changed, avoiding redundant builds on every push.

### 🔧 Changed

- **Vercel deployment**: All three apps (ERP, ERP, API) now use Turborepo for builds. Each app’s `vercel.json` has `installCommand: "cd ../.. && npm install"` and `buildCommand: "cd ../.. && npx turbo run build --filter=<app>"` so only that app and its deps are built per deployment.
- **Next.js 15 Server Components**: `next/dynamic` with `ssr: false` is not allowed in Server Components. Added client wrappers so that dynamic imports with `ssr: false` run only in Client Components:
  - **ERP app**: `StudentAssistantClientWrapper` and `ExamCreatorDynamic` in `apps/erp-app`; student assistant page and teacher exam create/edit pages use these wrappers.
  - **ERP app**: Same pattern in `apps/erp-app` for student assistant and teacher exam new/edit pages.
- **word-extractor types**: Added `@types/word-extractor` to `packages/ai` devDependencies to fix TS7016 (missing declaration) when the db workspace build type-checks the ai package on Vercel.

### 📚 Documentation & technical

- **Version**: 0.17.7 (root and api-server `package.json`).
- **Deployment**: `docs/DEPLOYMENT.md` updated with Turborepo build approach and Ignored Build Step instructions for per-app deploy skipping.
- **New files**: `turbo.json` (pipeline); `apps/erp-app` and `apps/erp-app`: `student-assistant-client-wrapper.tsx`, `exam-creator-dynamic.tsx` (client-only dynamic wrappers).

---

## [0.17.5] - 2026-02-26

### ✨ Added

#### **Multi-language support (Azerbaijani, Russian, English)**
- **Internationalization framework**: Integrated `next-intl` with cookie-based locale management (`NEXT_LOCALE`) for both ERP and ERP applications — no URL restructuring needed.
- **Language switcher**: New `LanguageSwitcher` component in `@eduator/ui` with dynamic country flag images from `flagcdn.com`; app-specific `LocaleSwitcher` wrappers for ERP and ERP handle cookie-based locale persistence.
- **ERP translated pages**: Landing, About, Services, Pricing, Login, Sign Up, Forgot Password, Find Teachers, Teacher Profile (including contact form, ratings), Find Courses, Course Details (including stats/rating, join/start actions).
- **ERP translated pages**: Landing, About, Services, Pricing, Login, Forgot Password.
- **Post-login translations**: User navigation dropdown (Settings, Sign Out) translated in both ERP and ERP (all roles).
- **Translation files**: `en.json`, `az.json`, `ru.json` message files for both applications with namespaced keys (landing, about, services, pricing, login, signup, forgotPassword, findTeachers, teacherProfile, findCourses, courseDetail, common).
- **Custom FilterDropdown component**: Replaced native `<select>` elements in the course directory filter bar (Language, Level, Rating) with custom dropdown components supporting flag images and consistent styling.

### 🔧 Changed

- **Next.js config**: Both apps now use the `next-intl` plugin (`createNextIntlPlugin`) wrapping the existing Next.js config.
- **Root layouts**: Both ERP and ERP `layout.tsx` wrapped with `NextIntlClientProvider` and dynamic `lang` attribute on `<html>`.
- **Public headers**: Server components fetch translations and pass the `LocaleSwitcher` to the shared `PublicHeaderClient`.
- **Course directory filter bar**: Parent container updated from `bg-white/90 backdrop-blur-sm` to `relative z-10 bg-white` to fix dropdown z-index stacking issues.
- **Dependencies**: Added `next-intl` to both `apps/erp-app` and `apps/erp-app`.
- **ERP middleware**: Added `/about`, `/services`, and `/pricing` to public routes.

### 📚 Documentation & technical

- **Version**: 0.17.5 (root `package.json`).
- **New files**: `apps/*/src/i18n/request.ts` (locale config), `apps/*/src/messages/{en,az,ru}.json` (translation files), `apps/*/src/app/components/locale-switcher.tsx` (app wrappers), `packages/ui/src/components/navigation/language-switcher.tsx` (shared component).

---

## [0.17.0] - 2026-02-25

### ✨ Added

#### **Performance optimization — full codebase audit (Phases 1–5)**
- **N+1 query elimination**: Batch lesson fetch via `getByIds`/`getByIdsFull` (course detail + run), batch org admin fetch (N queries → 1), batch class stats on school-admin dashboard (~20 queries → 8 parallel), batch exam submission stats in teacher reports, parallel final-exam lookups (`Promise.all`), fixed nested `await` in `classes.ts`.
- **Supabase client reuse**: One `createClient()` per request in teacher classes/calendar, student exams, platform-owner users, student/teacher dashboards (both apps); reduced 10 → 1 in several pages.
- **React `cache()` and `unstable_cache`**: `getSessionWithProfile` deduplicated across layout + page; public courses cached 60 s, org list cached 120 s.
- **Compression**: `compress: true` in both `next.config.js`; `@fastify/compress` on API server.
- **Dynamic imports**: `next/dynamic` for heavy components (`ExamCreator`, `TeacherCalendarHub`, `StudentAssistantClient`, `AIAgentWidget`) with loading skeletons.
- **Loading skeletons**: `loading.tsx` for teacher, student (both apps), school-admin, and platform-owner routes.
- **API parallelization**: Teacher dashboard and documents routes fetched in `Promise.all`; 6-month sequential loop flattened to single `Promise.all` (18 parallel).
- **Narrow selects**: `PROFILE_FIELDS_NAV` in all 5 layouts; platform-owner stats use count-only queries.
- **Schema cache TTL**: Increased from 5 min to 30 min.
- **Production log level**: `packages/agent` logger set to debug only in dev.
- **Net result**: −715 lines, +544 lines across 33 files; no security or quality regressions.

#### **Database RLS policy overhaul**
- **Merged 150+ permissive RLS policies** down to ~30 consolidated policies, eliminating redundant `auth.uid()` subplan evaluations.
- **Fixed `auth.*` InitPlan warnings**: Policies that triggered repeated `InitPlan` calls to `auth.uid()` or `auth.jwt()` were restructured to evaluate auth context once.
- **Migrations**: `20260225000000_fix_rls_auth_initplan.sql` and `20260225100000_merge_multiple_permissive_policies.sql`.

#### **Word document uploads**
- **New file types**: `.doc` and `.docx` uploads via `word-extractor` and `mammoth` libraries for text extraction.
- **File size limit**: Increased from 10 MB to 15 MB across all upload endpoints and UI validation.
- **Document stats**: UI components (explorer, stats strip) include Word file type counts and sizes.

#### **Lesson generation — objectives and grade level**
- **Manual learning objectives**: Teachers can optionally enter custom learning objectives. If provided, the AI generates the lesson around those specific objectives; if empty, objectives are generated automatically as before.
- **Grade level selection**: New grade-level slider (Grade 1–12, Undergraduate, Graduate, PhD) on lesson generation pages (ERP + ERP), mirroring the course generation feature. The selected grade actively influences vocabulary, complexity, and examples in the generated content.
- **AI prompt enhancement**: `gradeValueToLabel` helper converts grade codes to human-readable labels with age ranges; prompts dynamically inject grade and objective instructions.
- **Database**: `grade_level` column on `lessons` table populated directly from the API.

#### **Cross-language RAG processing**
- **Document language detection**: On upload/processing, the system auto-detects the document's content language (via Gemini) and saves it to a new `content_language` column on the `documents` table.
- **Query translation**: During RAG retrieval, if the user's query language differs from the document's language, the query is translated to the document's language before generating embeddings — ensuring accurate vector similarity search across language boundaries.
- **In-memory embeddings**: `cacheDocumentChunks` now returns generated embeddings directly from memory, bypassing potential JSONB column size limits for large documents (600+ chunks). A diagnostic warning is logged if the DB save count doesn't match.
- **Document info UI**: Document management pages (ERP + ERP) display the detected content language in both the list/grid views (blue globe badge) and the document info modal.

### 🔧 Changed

- **Animations**: Enhanced `fadeInUp`, new blob and glow-pulse animations for background effects in ERP and ERP landing pages.
- **Dependencies**: Updated `@supabase/ssr` (0.1.0 → 0.6.1), `esbuild` (0.24.0 → 0.27.3), `fastify` (4.26.0 → 5.7.4 → 4.26.0); added `word-extractor`, `mammoth`, and related XML/zip transitive dependencies.
- **Error handling**: Improved authentication error messaging and session management for Supabase service downtime.

### 📚 Documentation & technical

- **Version**: 0.17.0 (root and api-server `package.json`).
- **DB**: New `content_language` column on `documents`; `grade_level` populated on `lessons`; RLS migrations for policy consolidation.
- **Technical docs**: `docs/technical/RLS_LINTER_FIXES.md` — analysis and fix guide for the RLS warning reduction.

---

## [0.16.0] - 2026-02-23

### ✨ Added

#### **Student Assistant & dashboard – data and UX**
- **Upcoming exams (assistant + student dashboard)**: Upcoming exams now use the **student calendar** (scheduled items with `start_time`/`end_time`). Students see exams and **final exams** due today or in the next 60 days, with correct due date and take link. Final exam instances use `?finalExamId=...` for the take page (assistant and dashboard).
- **Class Updates (assistant)**: Class Updates step now uses a **30-day** window (was 7), fetches class names via a separate `classes` query (no nested relation), filters **published** lessons and exams, and has a **fallback**: when no items in the last 30 days, shows the latest 5 lessons and 5 exams from the student’s classes so the section is not empty when content exists.
- **Real dashboard stats (ERP + ERP)**: Student dashboard **Completed exams** and **Average score** are now computed from `exam_submissions` (distinct exams with a score, average of scores). **Learning streak** (ERP) is computed from `lesson_progress.completed_at` and `exam_submissions` activity dates (consecutive days including today).

### 🔧 Changed

- **Student Assistant UI/UX**: Hero card refined (gradient, copy). Wizard header hidden in **embedded** (drawer) mode to avoid duplicate with drawer title. Step tabs use a segmented control style. Today/Exams/Lessons/Updates/Progress cards use consistent styling (rounded-xl, hover states, empty states with icon + message). Chat panel: fixed-width column on desktop (`minmax(300px,380px)`), single-column layout in drawer; suggestion prompts as vertical buttons; min/max height and overflow handled. FAB: rounded-2xl, clearer shadow; drawer header and overlay polished.
- **Student dashboard stats when empty**: **Average score** and **Learning streak** show **"—"** instead of "0%" / "0 days" when there is no data, with short descriptions ("Take an exam to see your score", "Complete a lesson or exam to start").
- **Duplicate CTA removed**: **"Ask AI Tutor"** button removed from the student dashboard header (violet gradient); chat is still available via sidebar "AI Tutor" and the bottom "Chat Now" CTA.
- **AssistantExam / UpcomingExam**: Added optional **finalExamId** for scheduled final exams so take links include `?finalExamId=...` in assistant and dashboard.

### 📚 Documentation & technical

- **Version**: 0.16.0 (root and api-server package.json).
- **DB**: Student Assistant and dashboard rely on `class_enrollments`, `lesson_progress`, `exam_submissions`, and (for upcoming) calendar/final_exams; see `docs/STUDENT_ASSISTANT_DB_REQUIREMENTS.md` for required schema.

---

## [0.15.5] - 2026-02-19

### ✨ Added

#### **Course completion certificates (ERP student)**
- **Certificate of completion**: Students who **pass** the course final exam (score ≥ passing threshold) can view and download a certificate as proof of completion.
- **Certificate page** (`/student/courses/certificate/[accessCode]`): Displays course title, student name, completion date, final exam score and passing score; “Download as PDF” opens the browser print dialog (Save as PDF). Access allowed only when enrolled and passed; otherwise 404.
- **My Courses**: For passed courses, a **Certificate** button (Award icon) links to the certificate page.
- **Exam results**: When viewing results from a course run (`fromRun=1`) and the student passed, a **“View certificate & download PDF”** link is shown; requires `accessCode` in the results URL (included when navigating from My Courses or from course run → exam → results).
- **Core**: `getStudentExamResults` now returns `passingScore` (from exam settings) so the UI can show the certificate link only when passed.
- **UI**: `StudentExamResultsClient` accepts optional `certificateHref`; `StudentExamTakeClient` accepts optional `courseRunAccessCode` so redirect to results preserves the course context for the certificate link.

### 🔧 Changed

- **Course run → exam → results**: Exam URL from course run and “View result” from My Courses now include `accessCode` in query params; results page passes `certificateHref` when from course run and accessCode present; take client redirects to results with `accessCode` so the certificate link appears after submit when the student passes.

### 📚 Documentation & technical

- **Version**: 0.15.5 (root and api-server package.json).

---

## [0.15.0] - 2026-02-19

### ✨ Added

#### **Find Courses (ERP) – richer directory**
- **Course cards**: Rating (stars + count) and enrollment count on each card; “No ratings yet” when no reviews. Language flag moved to card header (top-left on gradient) for prominence; duplicate language line in meta row removed.
- **Filters**: Collapsible filter bar with **Language** (dropdown), **Level** (grade), and **Rating** (Any / 4+ stars / 3+ stars / Has reviews). Filters combine with existing search. “Clear filters” when any filter is active.
- **Data**: `getPublicCourses()` now fetches `course_ratings` and `course_enrollments` in bulk and merges `rating_average`, `rating_count`, `enrollment_count`, `view_count` into each course (with fallback when migration not run).

#### **Student – courses (ERP)**
- **Nav**: **Find Courses** (`/courses`) and **My Courses** (`/student/courses`) added to student sidebar.
- **My Courses page** (`/student/courses`): List of enrolled courses (title, lessons, duration, “Open course” → run page). **Join with access code** form: enter code, enroll via server action (admin client for course lookup and enroll to avoid RLS issues), then redirect to course or show error.
- **Shareable course page (student CTA)**:
  - **Not enrolled**: “Join course” (enrolls, then `router.refresh()` so UI updates on same page) and “My Courses”.
  - **Enrolled**: “Start course” (link to `/student/courses/run/[accessCode]`) and “My Courses”.
  - No auto-enroll on page view; enrollment only when student clicks “Join course”.
- **Access code**: Access code box removed from course detail; short copy explains “Sign in and click Join course, or enter the code on My Courses if your teacher shared it.”

#### **Student course run (Udemy/Coursera-style)**
- **Route**: `/student/courses/run/[accessCode]` – full course experience for enrolled students (redirects to `/c/[accessCode]` if not enrolled).
- **Content**: Lessons in course order, sidebar with progress, main area with lesson content (objectives, content, audio, images, mini test). **Mark Complete** persists to `lesson_progress` via `upsertLessonCompletion`. Next/Previous; **Final exam** (enabled after all lessons complete) links to `/student/exams/[id]`.
- **Teacher run client reused**: `CourseRunClient` extended with optional `backHref`, `getExamUrl(id)`, `initialCompletedLessonIds`, `onMarkComplete(lessonId, timeSpentSeconds)` so the same UI powers both teacher run and student run with student-specific links and persistence.
- **My Courses**: “Open course” on each card now goes to `/student/courses/run/[accessCode]` instead of the public course page.

### 🔧 Changed

- **Enrollment count**: `getCourseEnrollmentCount` uses `createAdminClient()` so the displayed count is the total number of students who joined (not restricted by RLS).
- **Course enroll (student)**: `enrollInCourse` and `recordCourseEnrollment` use admin client for the `course_enrollments` upsert so enrollment succeeds in server actions (RLS session issues avoided). Student identity still verified with user client before enrolling.
- **Join by access code**: `joinCourseByAccessCode` uses admin client to look up course by `access_code` so students can find courses despite RLS on `courses` table.
- **My Courses list**: `getEnrolledCourses` uses admin client to load course details (title, access_code, etc.) so the enrolled list is visible to students (RLS on `courses` was blocking the previous query).

### 📚 Documentation & technical

- **Version**: 0.15.0 (root and api-server package.json).
- **Technical**: Course ratings, enrollments, and view count migration and behavior documented in `docs/technical/COURSE_RATINGS_ENROLLMENTS_VIEWS.md`.

---

## [0.14.0] - 2026-02-16

### ✨ Added

#### **Initial tokens for new users**
- **Platform setting**: New token usage setting `initial_tokens_for_new_users` (default 100). Platform owner can change it from **Token settings** (`/platform-owner/token-settings`) in the "New user onboarding" section (e.g. 50, 100, 150, or 0 to disable).
- **Auto-grant on registration**: New users receive the configured amount automatically when created via: ERP signup, school admin (ERP) create user, platform owner create school admin, and AI agent create_user. `tokenRepository.grantInitialTokensForNewUser(profileId)` and `ensureInitialTokensForNewUsersSetting()` in `@eduator/db/repositories/tokens`.
- **Migration**: `supabase/migrations/20260216000000_add_initial_tokens_for_new_users_setting.sql` inserts the row if missing; page load also ensures the row exists so the control is always visible.

#### **Platform owner – user list & token info**
- **Users list**: Token balance column for each user (batch fetch via `getBalancesForProfiles`). Removed "Use case" column and redundant "View" link per feedback.
- **User detail**: Token balance card with link to Usage & payments. `tokenRepository.getBalance(profileId)` used on user detail page.

#### **Collapsible sidebar (platform owner & school admin)**
- **Platform owner**: New `PlatformOwnerLayoutClient` – desktop sidebar collapses to icon strip (w-16) with toggle button (PanelLeft/PanelLeftClose) in header; same behavior as teacher layout.
- **School admin**: New `SchoolAdminLayoutClient` – same collapsible sidebar with orange accent; organization name block hidden when collapsed. Both use `DesktopNavigation` with `collapsed` prop.

#### **API & integration docs – token system**
- **API.md**: 402 Payment Required and `INSUFFICIENT_TOKENS`; **Token system (AI features)** subsection; `GET /api/v1/teacher/tokens`; dashboard response includes `overview.token_balance`; exam/lesson/course generate descriptions note token consumption and 402.
- **INTEGRATION_GUIDE.md**: Step for token balance (check before AI ops, handle 402); `GET /api/v1/teacher/tokens` in endpoints table.
- **In-app API docs** (teacher API integration): Token balance callout, GET /tokens example, note to handle 402 in recommended flow.

#### **Other**
- **Usage & Payments page**: Enhanced data fetching and charting capabilities.
- **Course detail**: `CourseContentGenerating` component for empty lesson state.
- **Language**: Normalized language handling in course and lesson generation.

### 🔧 Changed

- **API server (teacher route)**: Imports `createExamSchema`, `examGenerationSchema` from `@eduator/core/validation/exam` and `CreateExamInput` from `@eduator/core/types/exam` to fix resolution (barrel exports not resolving in api-server).
- **Platform owner / school admin layouts**: Switched to client layout components for collapsible sidebar; server layout only passes navigation, logo, userSection, profile (and school admin headerContent).

### 📚 Documentation & technical

- **Version**: 0.14.0 (root package.json).
- **Docs**: API.md, FEATURES.md, ROADMAP.md, TOKEN_* docs updated for 0.14.0 where applicable.

---

## [0.13.0] - 2026-02-16

### ✨ Added

#### **Token system & payments (Phases 1–3 + UX)**
- **Database**: `token_balances`, `token_usage_settings`, `token_transactions`, `payments`; RPCs `deduct_tokens`, `add_tokens`; seeded usage settings (exam, lesson, course, chat). Migration and verify scripts in `supabase/`.
- **Core**: Token types (`@eduator/core/types/token`), cost calculation `getTokenCost(actionType, params, settings)` in `@eduator/core/utils/token-cost.ts`.
- **DB layer**: `tokenRepository` (getBalance, deductTokensForAction, addTokens, getTransactions, getUsageSettings, getTransactionsAdminWithProfiles, getUsageStatsAdmin), `paymentsRepository` (getPaymentsAdmin, getPaymentsStatsAdmin).
- **Deduction at every AI call**: Exam generation (ERP + ERP), lesson generation (API routes), lesson regenerate audio, course generation (API routes), teacher chat, student chat – all deduct before AI, return 402 when insufficient, refund on AI failure.
- **Course generation cost**: Course cost now includes **final exam** (same per-10-questions rate as standalone exam). Params include `exam_question_count`; API routes pass it so one course = base + lessons + exam.
- **Platform owner (ERP)**: **Usage & payments** page (`/platform-owner/usage-payments`) – summary stats, usage table, payments table. **Token settings** page (`/platform-owner/token-settings`) – grouped settings (Exam, Lesson, Course, Chat), inline edit, “How it works” callout.
- **Teacher UI (ERP + ERP)**: Teacher layout fetches balance; header shows “X tokens” link to `/teacher/tokens`; **Tokens** page shows balance, recent usage table, “Buy more” → pricing. `force-dynamic` on layout and tokens page so balance is not cached.

#### **Insufficient-balance messaging**
- **Backend**: When deduction fails, `tokenRepository.deductTokensForAction` returns a clear message: *“Not enough tokens. This action requires X tokens. Your balance: Y. Please buy more tokens or contact your administrator.”*
- **UI**: Lesson generate, course create (ERP + ERP), and exam creator show **“Not enough tokens”** as alert title when applicable, with link “View balance & buy more tokens” to `/teacher/tokens`. Chat shows the same message in an alert.

### 🔧 Changed

- **Token repository import**: All token deduction call sites import `tokenRepository` from `@eduator/db/repositories/tokens` (direct path) to avoid undefined at runtime in API routes and server actions.
- **Token settings description**: Course generation group now describes “Base + all lessons + final exam (one course = many AI operations)”.

### 📚 Documentation & technical

- **Version**: 0.13.0 (root package.json).
- **Docs**: `docs/TOKEN_STATUS.md`, `docs/TOKEN_DEDUCTION_CHECKLIST.md`, `docs/TOKEN_IMPLEMENTATION_CHECKLIST.md`, `docs/TOKEN_RECHECK.md` updated; `docs/ROADMAP.md` and `docs/FEATURES.md` updated for 0.13.0.

---

## [0.12.0] - 2026-02-13

### ✨ Added

#### **Course generation – use all selected documents**
- **Structure**: Course structure prompt now includes content from **all** documents (not only the first). Each document is labeled (`=== DOCUMENT 1 ===`, etc.); the AI is instructed to assign lesson 1 → document 1, lesson 2 → document 2, and so on so different subjects (e.g. Math, Biology, Physics, Chemistry) each get their own lesson.
- **Lessons**: Each lesson uses the document for its index: lesson 1 → doc 1, lesson 2 → doc 2 (round-robin if more lessons than docs). RAG and logs now show the correct document ID per lesson.
- **Exam**: Final exam uses all lesson content (so it covers all subjects). Fallback when no lessons now combines text from **all** documents. Exam metadata stores `source_documents` (array) instead of a single `source_document`.
- **Logging**: Console logs which document is used per lesson (e.g. `using document 2/4, id: ...`) and that all N documents are used at start.

#### **Structured course generation log**
- **Types**: New `GenerationLogEntry` and optional `generation_log` on `CourseGenerationResponse` (step, ts, duration_ms, lesson_index, lesson_id, success, message, error).
- **Steps logged**: course_structure, course_record, lesson_content and lesson_audio/lesson_images per lesson, final_exam, complete. Audio and image tasks are awaited so the log reflects success/failure for each lesson.
- **API**: Response includes `generation_log`; server logs full log as JSON for analysis after each run.

#### **TTS (audio) retry and logging**
- **Retry**: On 5xx from the TTS API, the request is retried up to 2 times with backoff (2s, 4s).
- **Logging**: Errors include lesson ID and attempt number (e.g. `TTS API error (lesson <id>) attempt 1/3`).

#### **Multi-document lesson generation**
- **Backend**: `generateLesson` accepts optional `documentIds?: string[]`. When multiple IDs are provided, RAG uses `getRelevantContentFromDocuments` so the lesson is generated from all selected documents.
- **API**: Teacher lesson generate route (ERP + ERP) accepts `documentIds` (array) or legacy `documentId`; validates all docs; passes `documentIds` to the generator when length > 1.
- **UI**: ERP “Generate AI Lesson” page now has **multi-select** documents (checkboxes). Teachers can select one or more sources; the lesson is generated from combined content.

#### **Exam generation and AI tutor**
- **Verified**: Exam generation (ExamCreator) and AI tutor/chat already support multiple documents; no code changes in this release.

### 🔧 Changed

- **Course-generated lessons – visibility**
  - Dashboard lesson count (ERP + ERP) and reports lesson counts now exclude course-generated lessons (`.or('course_generated.eq.0,course_generated.is.null')`). Standalone lesson list and stats already excluded them; now dashboard and reports match.
- **Teacher lessons utility**: Comment added that course-generated lessons are excluded and only visible inside the related course.

### 📚 Documentation & technical

- **Version**: 0.12.0 (root package.json).
- **API**: Course generation response may include `generation_log`; exam metadata uses `source_documents` array.

---

## [0.11.2] - 2026-02-12

### ✨ Added

#### **Course-generated vs in-app materials – full split**
- **Database**: New columns `course_generated` (SMALLINT, default 0) on `lessons` and `exams`. Migration: `supabase/migrations/20260212000000_add_course_generated_to_lessons_and_exams.sql`.
- **Semantics**: `0` = in-app or API generated (visible in lesson/exam lists, class, calendar). `1` = course-generated (visible only inside the course).
- **Course generator**: Sets `course_generated: 1` when creating lessons and the final exam so they are excluded from app lists and class/calendar.
- **Filtering**: All teacher lesson/exam lists, class shared/available content, student class view, student calendar, final-exam source list, and calendar drafts/events now exclude course-generated items (`.or('course_generated.eq.0,course_generated.is.null')`). Class stats and share-with-class actions also respect this; course-generated items cannot be assigned to a class.

### 🔧 Changed

- **Removed manual/course badges and source filter**: With course-generated materials fully split, "Manual" / "From course" badges and the source filter tabs (All / Manual / From course) were removed from teacher lesson list, exam list, and calendar.
- **Core**: `EnrichedTeacherLesson` and `EnrichedTeacherExam` no longer include `isFromCourse`, `courseId`, `courseTitle`, `courseAccessCode`. `TeacherLessonListParams` and `TeacherExamListParams` no longer include `source`.
- **Calendar**: Drafts and scheduled events no longer set or display `source`; "Show manual-only materials" toggle and Manual/From course/AI badges removed from drafts sidebar.
- **Exam detail**: Course badge and `getCourseInfoForExam` removed from teacher exam detail (ERP + ERP); description always shown.
- **Types**: `Lesson`, `Exam`, `CreateLessonInput`, `CreateExamInput` and DB repo types include optional `course_generated`.

### 📚 Documentation & technical

- **Version**: 0.11.2 (root package.json).

---

## [0.11.0] - 2026-02-11

### ✨ Added

#### **Learning objectives – never skipped (lessons & courses)**
- **Lesson generation (single & course)**: Learning objectives are always preserved. If the AI omits the JSON `learning_objectives` field, they are extracted from the markdown content (e.g. "## Learning Objectives" section). If the response is truncated (e.g. first lesson in a long course), objectives are recovered from the raw API response.
- **Prompt**: Lesson prompt now requires a non-empty `learning_objectives` array (3–5 items) and asks the model to output `title` and `learning_objectives` first to avoid truncation.
- **API**: Generate-lesson response and course-generated lessons now include or reliably store `learning_objectives`; course generator uses a safe fallback array when saving.

#### **Universal language codes (2-letter) for lessons & courses**
- **Config**: `normalizeLanguageCode(lang)` and `getLanguageNameForPrompt(code)` in `@eduator/config` so storage and UI use 2-letter codes (en, az, ru, …) and prompts get full names only when needed.
- **Everywhere**: Lesson generation (app + API), course creation, and lesson list all store and pass 2-letter codes. Legacy values like "English" in the DB are normalized when building the lesson list, so language flags display correctly for all lessons (standalone and from courses).
- **Course create**: Sends language code (e.g. `en`) to the API instead of full name; course generator normalizes input and saves code to course and lessons.

#### **Course deletion – clear feedback when blocked**
- **Rule**: Course cannot be deleted if any lesson or the course final exam is assigned to a class (unchanged).
- **User feedback**: When delete is blocked, the user now sees an alert: *"A lesson or exam from this course was added to a class. Remove it from the class first, then try again."* Shown from both the courses list delete flow and the course detail page delete action.

#### **Final exams (ERP + ERP)**
- **Course final exams**: Courses can include a final exam; generated and linked during course creation; visible and manageable from the course flow.

#### **Other improvements**
- **Document upload**: Improved processing and response handling.
- **Exam & lesson deletion**: Ownership verification so only the owner can delete.
- **Lesson content**: Normalization for consistent formatting; refactored content handling and rendering options (e.g. center text).
- **Language support**: Lesson generation and exam creation support multi-language (en, az, ru, tr, de, fr, es, ar) with correct storage and display.
- **Teacher info**: Fixed organization ID retrieval in teacher info function.

### 🔧 Changed

- **Course generator**: Uses `languageCode` (2-letter) for all DB writes and `generateLesson`; uses full language name only for AI structure prompt.
- **useGenerateLesson**: Default language is `'en'` (was `'English'`).
- **Lesson generate API (ERP + ERP)**: Normalizes request body language via `normalizeLanguageCode`; response includes `learning_objectives`.
- **extractLessonLanguages**: Normalizes primary and translation languages to 2-letter codes so list flags always resolve.
- **Regenerate audio action**: Uses `normalizeLanguageCode(lesson.language)` so TTS receives a valid code.

### 📚 Documentation & technical

- **Version**: 0.11.0 (root package.json).

---

## [0.10.0] - 2026-02-05

### ✨ Added

#### **Auth-aware public headers (ERP + ERP)**
- **Public pages show logged-in state**: Home, About, Pricing, Services (and on ERP: Find Teachers, teacher profile) now use a shared **PublicHeader** that reads the current user’s profile on the server.
- **When logged in**: Header shows **Dashboard** (link to `/teacher`, `/student`, or ERP role-specific) and **UserNav** (avatar, name, Settings, Sign out). Teacher uses violet accent, student uses green (ERP).
- **When not logged in**: Header shows Sign In and Get Started (ERP) or Sign In (ERP).
- **ERP**: `PublicHeader` on `/`, `/about`, `/pricing`, `/services`, `/teachers`, `/teachers/[id]`.
- **ERP**: `PublicHeader` on `/`, `/about`, `/pricing`, `/services`, `/org/[slug]`; optional `settingsPath` on UserNav for correct Settings link by role.

#### **Find Teachers & contact requests (ERP)**
- **Contact requests – student info for teachers**: When a student sends a contact request, the app now stores **student name**, **email**, **bio**, and **avatar URL** on the `contact_requests` row (snapshot at submit time). Teachers see avatar, name, email, short bio, and message in the Contact requests list; revalidate and migration in `docs/technical/CONTACT_REQUESTS_STUDENT_INFO.sql` (adds `student_name`, `student_email`, `student_bio`, `student_avatar_url`).
- **Teacher profile page – tabbed layout**: Single page **Public profile & requests** (`/teacher/profile`) with tabs: **Overview** (how you appear), **Edit profile** (photo, headline, subjects, bio, visibility), **Contact requests** (filters, pagination, delete, mark read/archived), **Feedback** (ratings summary and list). Hash `#requests` opens the Contact requests tab (e.g. from redirect).

#### **Student profile & settings (ERP)**
- **Student settings – editable profile**: **Profile photo** upload (avatars bucket, same as teachers), **Display name**, and **Short bio** (max 1000 chars) in **Account settings** (`/student/settings`). Stored in `profiles` (avatar_url, full_name) and `metadata.bio`. Teachers see this snapshot in contact requests when the student has filled it in.

#### **Teacher ratings & feedback (ERP)**
- **Students rate teachers**: On the public teacher profile (`/teachers/[id]`), logged-in students can **rate** the teacher (1–5 stars) and add an optional comment. **One rating per student per teacher**: submitting again **updates** the existing rating (e.g. positive → negative).
- **Database**: `teacher_ratings` table (`docs/technical/TEACHER_RATINGS_MIGRATION.sql`) with `student_id`, `teacher_id`, `score` (1–5), `feedback_text`, unique on `(student_id, teacher_id)`, RLS for read/insert/update.
- **Public teacher page**: **Ratings & feedback** block shows average stars and count; students see a rate form (stars + optional comment) or “Your rating (click to change)” when they already rated.
- **Teacher profile – Feedback tab**: Placeholder replaced with **real data**: average rating, count, and list of ratings (stars + optional comment + date; no student identity).

### 🔧 Changed

- **Contact request submit**: Now sends student’s `full_name`, `email`, `avatar_url`, and `metadata.bio` so the teacher view can show them without joining to `profiles` (avoids RLS issues).
- **Teacher contact requests UI**: Each request card shows student avatar, name, email, bio (if present), and message; mailto link for reply.
- **Student settings**: Replaced read-only “contact your admin” copy with editable **ProfileSection** (avatar, name, bio) and success message that teachers will see this when the student contacts them.
- **ERP UserNav**: Added optional **settingsPath** so public header can link to the correct Settings page by role (platform owner, school admin, teacher, student).

### 📚 Documentation & technical

- **Migrations**: `CONTACT_REQUESTS_STUDENT_INFO.sql` (student_name, student_email, student_bio, student_avatar_url); `TEACHER_RATINGS_MIGRATION.sql` (teacher_ratings table + RLS).
- **Version**: 0.10.0 (root package.json).

---


## [0.9.6] - 2026-02-05

### ✨ Added

#### **Student progress dashboards (ERP + ERP)**
- **My Progress** (`/student/progress`, ERP + ERP): New student dashboards showing:
  - Total lesson time, completed lessons, in‑progress lessons, and exams taken.
  - Lesson completion bar (overall completion %) and “time spent by lesson” mini-chart.
  - Exam performance mini-chart (best scores per exam + average best score).
  - Minimal “Lessons you’ve started” section that only lists lessons with tracked time/progress.
- **Data sources**:
  - Reuses `getAvailableLessons` + `getStudentLessonProgress` for lesson time/completion.
  - Reuses `getAvailableExams` and exam submissions stats for attempt counts and scores.

#### **Unified student settings (ERP + ERP)**
- **Account settings** (`/student/settings`, ERP + ERP):
  - Clean, minimal account card (avatar, name, email, account type label).
  - Read-only explanatory copy (changes managed by school/workspace admins).
  - Simple “Sign out” block with logout button.
- **Navigation cleanup**:
  - Removed separate `Profile` item from student sidebars in ERP and ERP.
  - All account-related actions now live under a single `Settings` entry.

#### **Student exams list filters**
- **Combined filters** on `/student/exams`:
  - “Class” and “Teacher” filters now appear together in one pill-style filter row.
  - Matches the visual pattern already used on the student lessons list for consistency.

---


## [0.9.1] - 2026-02-04

### ✨ Added

#### **Education Plans (teacher curriculum plans)**
- **Teacher – Education Plans**: New section for teachers (ERP + ERP) to create and manage curriculum plans per class.
  - **List** (`/teacher/education-plans`): View all plans; each plan shows name, class, period, schedule, and “Shared” badge when visible to students.
  - **Create** (`/teacher/education-plans/create`): Configure plan name, class/group, period (months), sessions per week, hours per session, audience; optionally select documents; **Generate with AI** (from documents) or **Build manually** (empty week grid); then save.
  - **Detail** (`/teacher/education-plans/[id]`): View full week-by-week plan; **Share with students** toggle so the plan appears in the class’s Plan tab for students.
- **API**: `POST /api/teacher/education-plans/generate` (ERP + ERP) – AI-generated week-by-week content via `@eduator/ai/services/education-plan-generator` (Gemini); optional document context for alignment.
- **Database**: `education_plans` table (see `docs/technical/EDUCATION_PLANS_MIGRATION.sql`) with RLS: teachers manage own plans; students can read shared plans for classes they’re enrolled in.
- **Student – Plan tab**: Class detail page (ERP + ERP) shows a **Plan** tab when the teacher has shared an education plan for that class; students see plan name, description, schedule, and full week-by-week topics and objectives.

### 🔧 Changed

- **Core**: New types `EducationPlan`, `EducationPlanWeek`, `CreateEducationPlanInput`, `UpdateEducationPlanInput` in `@eduator/core/types/education-plan`.
- **Sidebar**: “Education Plans” nav item (CalendarRange icon) added to teacher layout in ERP and ERP.

---


## [0.9.0] - 2026-02-04

### ✨ Added

#### **Student exams – multiple attempts and progress**
- **Multiple attempts**: Students can take the same exam many times (10, 15+, etc.); each attempt is stored as a separate submission.
- **Score on submit**: Server-side scoring via `@eduator/core/utils/student-exam-submit` – `computeExamScore()` calculates percentage from correct answers and stores it on each submission (ERP + ERP).
- **Attempt stats**: Each exam now shows **attempt count**, **best score**, and **average score** (from all scored attempts).
- **Exam list** (`/student/exams`): New “Your attempts” column (desktop) and inline stats (mobile): “X attempts · Best: Y% · Avg: Z%”. Header stat shows “Showing X of Y” when filters are applied.
- **Exam take page**: “Your progress” box before Start shows “You’ve taken this exam X times · Best: Y% · Average: Z%” when the student has prior attempts.

#### **Student exam UX – variants and explanations**
- **A/B/C/D variant labels**: Multiple-choice and multiple-select options show clear variant letters (A, B, C, D, …); true/false shows A/B. Same labels on the results/review page.
- **Explanations**: Question explanations are included in exam detail and results. Shown **during** the exam after the student selects an answer (green “Explanation” block) and on the **results** page per question.

#### **Student UI/UX improvements**
- **Calendar** (ERP + ERP): Hero-style header (indigo/violet gradient), stats (Upcoming / Past), improved empty state with links to Exams and Lessons, better card styling (larger icons, status colors, rounded-xl).
- **Lessons list**: Class filter (All Classes + per-class chips), “Showing X of Y” when filtered; header stats use filtered counts.
- **Classes list**: Header shows “Showing X of Y” when search is active.
- **Class detail**: Removed debug `console.log` (ERP + ERP). Exam cards show single “X questions” line (duplicate “X Q” / “X questions” removed).

### 🔧 Changed

- **Student exams list**: Removed Status column from desktop table. “Completed” label shows “Best X%” when attempt stats exist.
- **getAvailableExams**: Fetches all submissions per exam; computes and returns `attempt_count`, `best_score`, `average_score`; `submission_score` is set to best score.
- **getStudentExamDetail**: Returns `attempt_count`, `best_score`, `average_score`; normalizes **translations** so each language’s questions have the same shape as primary (`question` from `q.question || q.text`).
- **Exam take client**: Displays question text with fallback `question || text` so translated questions never show blank.

### 🐛 Fixed

- **Calendar exams – question not visible**: Translated questions were passed through raw; some had `text` but no `question`, so only options showed. All translations are now normalized in `getStudentExamDetail` (same shape as primary), and the take client falls back to `text` for display.
- **Student exam results**: `explanation` added to question results and displayed in the review section (green “Explanation” block per question).
- **Student class detail**: Duplicate “X Q” and “X questions” in exam cards removed; single “X questions” + duration.

---


## [0.8.5] - 2026-02-04

### ✨ Added

#### **Teacher exams & lessons – shared logic and UX**
- **Core utilities** (ERP + ERP):
  - `@eduator/core/utils/teacher-exams`: `getTeacherExams`, `getTeacherExamStats`, `extractExamLanguages`, `extractExamTopics`, enriched exam type with `languages`, `topics`, `usedInClass`, `usedInCalendar`, `className`, course badges.
  - `@eduator/core/utils/teacher-lessons`: `getTeacherLessons`, `getTeacherLessonStats`, `extractLessonLanguages`, enriched lesson type with `languages`, `usedInClass`, `usedInCalendar`, `className`, course badges.
  - `@eduator/core/utils/teacher-classes`: `getTeacherClasses` for class filter dropdowns.
- **Class filter**: Teacher exams and lessons list pages (ERP + ERP) now have a class filter (All classes / per-class).
- **“Used in” column**: Desktop table shows a single “Used in” column with badges: Class (with class name), Calendar, From Course (with link), Manual. Mobile cards show the same badges below the title.
- **Languages on lessons**: Lesson list (ERP + ERP) now shows a **Languages** column (desktop) and language flags (mobile), derived from `lesson.language` and `lesson.translations`, matching the exams behavior.

#### **Student experience**
- **Calendar** (`/student/calendar`): New page showing scheduled exams and lessons for the student’s enrolled classes (upcoming and past), with clear availability indicators. “Calendar” added to student sidebar in ERP and ERP.
- **Profile** (`/student/profile`): New page with profile info and a “Your teachers” section (teachers from enrolled classes, deduplicated, with class names). “Profile” added to student sidebar in ERP and ERP.
- **Core**: `@eduator/core/utils/student-calendar` – `getStudentCalendar` for fetching scheduled items in a time window.

### 🔧 Changed

- **Teacher lessons list**: Removed the separate “Class” column; class is shown only in the “Used in” badges (ERP + ERP).
- Teacher exams and lessons pages refactored to use the new core utilities, reducing duplication between ERP and ERP.

### 🐛 Fixed

- Type handling for list filters: `source` and related params accepted as `string | undefined` in core utils for compatibility with URL search params.

---


## [0.8.1] - 2026-02-04

### ✨ Added
- **Universal exam question shape (API + app)**:
  - Exams created via API now return and store questions with both field styles:
    - API/core: `question`, `correct_answer`, `tags`
    - App/UI aliases: `text`, `correctAnswer`, `topics`
  - App exam view/edit pages normalize questions so API-generated exams display correctly.
- **Excel export (teacher)**:
  - Export questions + answers to an Excel-friendly CSV (UTF‑8 BOM for Cyrillic/Unicode).
  - Options exported into separate columns (Option A–E) with correct answer as letter(s) (e.g. `C`, `A, C`).
  - Export button available on both exam **edit/create** and exam **view** pages.

### 🐛 Fixed
- **Exam generation quality**:
  - Prevent page/section references in questions (e.g. “page 17”, “ВВЕДЕНИИ”).
  - Prevent references to unseen tables/figures unless included in the question text.
  - Enforce consistent option counts (4 for multiple choice/multiple select; 2 for true/false).
- **Large exam generation reliability**:
  - Batching defaults tuned for stability, with progress logging and per-batch timeouts.
  - Removed conflicting prompt instructions that could cause Gemini to generate the full total in each batch.
- **API Integration → Usage tab**:
  - Long-running success requests (exam/lesson generation) are now reliably recorded.

### 🔧 Changed
- Version bump to 0.8.1

---


## [0.8.0] - 2026-01-29

### Changed
- Version bump to 0.8.0

---


## [0.7.5] - 2026-01-26

### 🎉 Major Release - Teacher's Smart Calendar Hub

This release introduces a comprehensive calendar management system for teachers, transforming the simple material assignment into an intelligent scheduling command center. Teachers can now visually manage their weekly schedule with drag-and-drop functionality, class filtering, and real-time event tracking.

### ✨ Added

#### **Teacher's Smart Calendar Hub** (`/teacher/calendar`)
- **Unified Calendar Interface**:
  - Weekly grid view with Monday-Sunday layout
  - Working hours view (9:00 AM - 6:00 PM) with toggle to 24-hour view
  - Visual event indicators with color coding (Violet for Exams, Emerald for Lessons)
  - Today's date highlighting with visual indicators
  - Event count badges per day
  - Smooth week navigation (Previous/Today/Next buttons)
  - Weekly event count summary

- **Drafts Sidebar**:
  - Left-side drawer with "Ready-to-Use" AI-generated materials
  - Separate sections for Exams and Lessons with counts
  - Searchable draft library with real-time filtering
  - Pagination support (15 items per page) for scalability
  - Drag-and-drop enabled for all draft materials
  - Visual status indicators (Published/Draft badges)
  - Compact card design optimized for large datasets (100+ items)

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
  - Handles classes with NULL `teacher_id` correctly

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

- **UI/UX Enhancements**:
  - Glassmorphism design with floating glass cards
  - Haptic dragging with glowing slot indicators
  - Color legend for event types (Exam, Lesson, Draft)
  - Compact event cards with type icons
  - Status badges (Published/Draft) with visual distinction
  - Responsive design for mobile and desktop
  - Optimized for handling 50+ classes and 100+ events

#### **Database Schema Updates**
- **Lessons Table**:
  - Added `start_time` and `end_time` columns (TIMESTAMP WITH TIME ZONE)
  - Enables lesson scheduling similar to exams
  - Backward compatible with existing lessons

- **Class Teachers Table**:
  - Removed `role` column distinction (primary vs teacher)
  - Simplified teacher assignment model
  - All assigned teachers have equal permissions

#### **Enhanced Data Fetching**
- **Class Loading**:
  - Fetches classes where teacher is primary (direct `teacher_id`)
  - Fetches classes assigned via `class_teachers` junction table
  - Handles NULL `teacher_id` correctly in SQL queries
  - Comprehensive server-side logging for debugging
  - Deduplication of classes across both sources

- **Drafts Loading**:
  - Fetches all exams and lessons created by teacher
  - Shows both scheduled and unscheduled materials
  - Error handling and logging for troubleshooting
  - Supports rescheduling of existing events

- **Scheduled Events**:
  - Fetches scheduled exams with `start_time` and `end_time`
  - Fetches scheduled lessons (now supported)
  - Class name resolution for all events
  - Student enrollment count calculation
  - Live status indicators

### 🔧 Changed

- **Teacher Role Simplification**:
  - Removed "Primary Teacher" vs "Assistant Teacher" distinction
  - All teachers assigned to a class have equal permissions
  - Simplified UI in class management pages
  - Updated database records to set `role = NULL` in `class_teachers`

- **Calendar Component Architecture**:
  - Reusable components in `@eduator/ui` package
  - Shared code between ERP and ERP versions
  - `TeacherCalendarHub` orchestrates all calendar components
  - `SmartCalendar` handles grid rendering and drag-and-drop
  - `DraftsSidebar` manages draft materials display
  - `QuickEditPanel` provides event editing interface

- **Working Hours Configuration**:
  - Changed from 7:00 AM - 7:00 PM to 9:00 AM - 6:00 PM
  - 10-hour working day view (9am-6pm)
  - Toggle between working hours and full 24-hour view

### 🐛 Fixed

- **Lessons Scheduling**:
  - Fixed missing `start_time` and `end_time` columns in `lessons` table
  - Lessons can now be scheduled and displayed on calendar
  - Fixed SQL queries that attempted to select non-existent columns

- **Class Loading Issues**:
  - Fixed empty class dropdown in calendar filter
  - Resolved NULL comparison issues in SQL queries
  - Fixed `.neq('teacher_id', teacherId)` filter that excluded NULL values
  - Improved handling of teachers assigned via `class_teachers` table

- **Drag-and-Drop Errors**:
  - Fixed "Unexpected end of JSON input" error when dragging existing events
  - Added `onDragStart` handler for calendar events
  - Improved error handling in `handleDrop` function
  - Better validation of drag data before parsing

- **Data Fetching**:
  - Fixed lessons not appearing in drafts sidebar
  - Improved error logging for debugging
  - Fixed organization ID filtering in ERP version
  - Enhanced server-side logging for troubleshooting

### 🗄️ Database

#### **Schema Changes**
- `lessons` table: Added `start_time` and `end_time` columns
- `class_teachers` table: `role` column now optional (set to NULL for all records)

#### **Migrations**
- No new migrations required (columns added via direct SQL)

### 📦 Package Updates

- **Updated Packages**:
  - `@eduator/ui`: New calendar components (`TeacherCalendarHub`, `SmartCalendar`, `DraftsSidebar`, `QuickEditPanel`)
  - Enhanced type definitions for `CalendarEvent` and `DraftMaterial`

### 🔒 Security

- **Access Control**:
  - Teachers can only view and schedule their own materials
  - Class filtering respects teacher assignments
  - RLS policies enforced for all calendar data
  - Organization-scoped queries for multi-tenant support

### 📚 Documentation

- **Updated Documents**:
  - `CHANGELOG.md`: Version 0.7.5 release notes
  - Version updated to 0.7.5 across all package.json files

### 🚧 Technical Improvements

- **Code Quality**:
  - Improved error handling and logging throughout calendar system
  - Better TypeScript type safety for calendar events
  - Enhanced component reusability between ERP and ERP
  - Consistent code patterns for drag-and-drop functionality

- **Performance**:
  - Pagination in drafts sidebar for large datasets
  - Optimized class filtering with search
  - Efficient event rendering with memoization
  - Reduced re-renders with proper React hooks usage

---


## [0.7.0] - 2026-01-26

### 🎉 Major Release - AI Curriculum Architect & Course Management

This release introduces a comprehensive AI-powered course generation system that transforms static documents into dynamic, multi-level, multi-lingual self-paced courses. Teachers can now create complete course structures with lessons, exams, and audio narration in a streamlined workflow.

### ✨ Added

#### **AI Curriculum Architect - Course Generation** (`/teacher/courses/create`)
- **5-Step Course Creation Wizard**: Documents → Blueprint → Options → Generation → Summary
  - **Step 1 - Documents**: Select source documents for RAG-based course generation
  - **Step 2 - Blueprint**: Configure course parameters
    - Number of lessons (1-10)
    - Difficulty level (Grade 1-12, Undergraduate, Graduate, PhD)
    - Course style (Serious & Academic, Fun & Gamified)
    - Language selection (8+ languages with flag icons)
    - Optional course topic for focused content
    - Optional lesson topics (specific names/topics for each lesson)
    - Advanced exam settings:
      - Question count
      - Question types (Multiple Choice, Multiple Select, Fill in the Blank, True/False)
      - Difficulty distribution (Easy/Medium/Hard percentages)
  - **Step 3 - Options**: Optional generation options before starting
  - **Step 4 - Generation**: Real-time progress tracking
    - Live progress updates (analyzing documents, creating structure, generating lessons)
    - Lesson-by-lesson generation status
    - Estimated completion time
  - **Step 5 - Summary**: Review generated course and go to course detail

- **Multi-Level Course Generation**:
  - AI generates complete course structure from documents
  - Creates multiple sequential lessons with proper ordering
  - Generates final exam with configurable parameters
  - Automatic lesson prerequisites and dependencies
  - Visual gap detection for learning materials

- **Course Generation Features**:
  - Document-based RAG (Retrieval Augmented Generation)
  - Agentic AI with ReAct pattern for reasoning
  - Automatic pedagogy adaptation
  - Multi-lingual content generation
  - Resource integration and visual learning gap detection
  - Background TTS audio generation for all lessons
  - JSON parsing with enhanced error recovery

#### **Course Run/Player Interface** (`/teacher/courses/[id]/run`)
- **Coursera/Udemy-Style Course Player**:
  - Sticky top navigation bar with course title and progress
  - Responsive sidebar with lesson navigation
  - Clickable lesson list with completion status
  - Real-time time tracking for each lesson
  - Lesson completion tracking
  - Final exam access after all lessons completed

- **Real-Time Time Tracking**:
  - Automatic time tracking for each lesson
  - Updates every second without page refresh
  - Displays time spent in sidebar and lesson header
  - Tracks time across lesson navigation
  - Persistent time tracking during session

- **Audio Player Integration**:
  - Audio player displayed for lessons with TTS audio
  - Play/pause controls with progress bar
  - Time display and volume controls
  - Seamless integration with lesson content

- **Course Navigation**:
  - Previous/Next lesson navigation
  - Direct lesson access from sidebar
  - Final exam button when all lessons completed
  - Progress indicator showing completion percentage

#### **Course Management**
- **Course Edit Functionality** (`/teacher/courses/[id]/edit`):
  - Edit course title, description, subject, and grade level
  - View read-only course settings (difficulty, style, language, access code)
  - Form validation and error handling

- **Course Delete Functionality**:
  - Delete courses with confirmation modal
  - Prevents accidental deletions
  - Available from course detail page and courses list

- **Course Publish/Unpublish**:
  - Toggle course publication status
  - Available from course detail page and courses list
  - Visual status indicators

#### **Enhanced Course Detail Page** (`/teacher/courses/[id]`)
- **Comprehensive Course Information**:
  - Course metadata with flag icons for language
  - Course statistics (lessons, access code, difficulty, language)
  - Estimated duration display
  - Course style and subject information

- **Final Exam Information Display**:
  - Final exam section with detailed information
  - Question types breakdown (count per type)
  - Difficulty distribution (Easy/Medium/Hard counts)
  - Exam settings (passing score, max attempts, shuffle settings)
  - Direct link to view exam
  - Color-coded badges for question types and difficulty

- **Lessons List**:
  - Ordered list of all course lessons
  - Lesson metadata (topic, duration, creation date)
  - Published/Draft status indicators
  - Direct links to individual lessons

#### **Content Source Tracking**
- **Lesson Source Filtering** (`/teacher/lessons`):
  - Filter tabs: "All", "Manual", "From Course"
  - Visual badges indicating source (Course/Manual)
  - Clickable course badges linking to source course
  - Works for both desktop table and mobile card views

- **Exam Source Filtering** (`/teacher/exams`):
  - Filter tabs: "All", "Manual", "From Course"
  - Visual badges indicating source (Course/Manual)
  - Clickable course badges linking to source course
  - Identifies exams linked as final exams in courses

- **Metadata Tracking**:
  - Lessons and exams track `from_course_id` and `course_title` in metadata
  - Backward compatibility with courses that reference lessons/exams via IDs
  - Automatic enrichment of lesson/exam data with course information

#### **Course List Enhancements** (`/teacher/courses`)
- **Action Buttons**:
  - View, Edit, Publish/Unpublish, Delete buttons for each course
  - Delete confirmation modal
  - Loading states during actions
  - Success/error feedback

### 🔧 Changed

- **Course Generation API**:
  - Enhanced JSON parsing with multiple error recovery strategies
  - Improved handling of trailing commas and unterminated strings
  - Better error messages and logging
  - Background audio generation doesn't block course creation

- **Course Run Client Component**:
  - Refactored time tracking to use state updates instead of refs
  - Fixed infinite re-render issues with proper dependency management
  - Improved sidebar responsiveness and mobile experience

- **Next.js 15 Compatibility**:
  - Fixed Client/Server Component boundaries
  - Created wrapper components for server actions
  - Resolved nested `<a>` tag issues in HTML structure
  - Proper event handler passing between components

### 🐛 Fixed

- **Time Tracking**:
  - Fixed real-time time updates not showing without page refresh
  - Resolved "Maximum update depth exceeded" error in course run component
  - Time now updates every second automatically

- **Audio Player**:
  - Fixed missing audio player in course run view
  - Audio now displays correctly for lessons with TTS audio
  - Proper audio URL fetching and display

- **TypeScript Errors**:
  - Fixed missing imports for `CourseBadgeLink` components
  - Resolved type errors in course generation parameters
  - Fixed `rootDir` ambiguity errors in AI package

- **HTML Structure**:
  - Fixed nested `<a>` tags causing hydration errors
  - Restructured course badge links to be siblings instead of nested
  - Improved accessibility and semantic HTML

- **Course Generation**:
  - Fixed foreign key constraint error (using profile ID instead of user ID)
  - Improved error handling for JSON parsing failures
  - Better handling of missing or invalid exam settings

### 📚 Documentation

- **Updated Documents**:
  - `CHANGELOG.md`: Version 0.7.0 release notes
  - `docs/ROADMAP.md`: Marked version 0.7.0 as completed
  - Version updated to 0.7.0 across all package.json files

### 🔧 Enhanced

#### **Universal AI Agent System** (`@eduator/agent`)
- **Platform Owner & School Admin AI Assistant**: Intelligent agentic AI system for administrative tasks
  - **SQL Query Execution**: Execute SELECT queries with automatic RLS enforcement
  - **Administrative Actions**: Create users, classes, organizations, students, teachers via natural language
  - **Multi-Step Actions**: Create organization + admin in single request
  - **AI Agent Widget**: Floating chat interface with Think/Agent mode switcher
  - **QA Modal**: Example questions for quick reference
  - **Multi-Language Support**: Automatic language detection and response matching
  - **Voice Input (STT)**: Speech-to-Text transcription support for hands-free interaction
  - **AI-Powered Formatting**: Human-readable result formatting
  - **Query Normalization**: Handles common mistakes (users → profiles, automatic JOINs)
  - **Comprehensive Documentation**: 200+ example queries in POSSIBLE_QUESTIONS.md
  - **Security**: Row-Level Security (RLS) enforcement for all queries
  - **Reflection/Retry Loop**: Autonomous error correction through reflection
  - **Enhanced Intent Classification**: Intelligently classifies user intent (inquiry, action, conversation)

### 🚧 Technical Improvements

- **Code Quality**:
  - Improved error handling and logging
  - Better TypeScript type safety
  - Enhanced component reusability
  - Consistent code patterns across ERP and ERP versions

- **Performance**:
  - Background audio generation doesn't block course creation
  - Optimized time tracking updates
  - Better state management in course run component

---


## [0.6.0] - 2026-01-15

### 🎉 Major Release - Universal AI Agent System

This release introduces a comprehensive, security-first AI agent system that provides intelligent assistance to Platform Owners and School Administrators. The agent can answer data questions via SQL queries and perform administrative actions, all while respecting Row-Level Security (RLS) policies.

### ✨ Added

#### **Universal AI Agent Package** (`@eduator/agent`)
- **Core Agent System**:
  - ReAct pattern (Reason-Action) architecture for intelligent decision-making
  - Intent classification (inquiry vs action)
  - SQL query generation and execution with automatic RLS enforcement
  - Multi-step action orchestration (e.g., create organization then create admin)
  - Automatic language detection and response matching
  - Context-aware responses based on user role and organization

- **SQL Query Execution**:
  - Intelligent query normalization (replaces `users`, `teachers`, `students` with `profiles`)
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

- **Security & Validation**:
  - Row-Level Security (RLS) enforcement for all queries
  - SQL injection prevention (only SELECT queries allowed)
  - Input validation for all action tools
  - Role-based access control (Platform Owner vs School Admin)
  - Organization-scoped queries for School Admins

- **Language Support**:
  - Automatic language detection from user queries
  - Multi-language response generation (Azerbaijani, Russian, English, Turkish, etc.)
  - Language-specific system prompts
  - Context-aware translations

#### **AI Agent Widget** (`@eduator/ui`)
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

- **UI/UX Improvements**:
  - Modern message bubbles with proper spacing
  - Improved typography and readability
  - Better error message display
  - Loading states with spinners
  - Responsive design for mobile and desktop

#### **ERP Integration**
- **Platform Owner Dashboard**:
  - AI Agent widget integrated into layout
  - Full access to all organizations and users
  - Can create organizations and assign admins

- **School Admin Dashboard**:
  - AI Agent widget integrated into layout
  - Organization-scoped queries and actions
  - Can manage users and classes within organization

#### **Documentation**
- **POSSIBLE_QUESTIONS.md**:
  - Comprehensive list of 200+ example queries
  - Categorized by entity type (Users, Organizations, Classes, Exams, Lessons, Documents)
  - Multi-language examples (English, Azerbaijani)
  - Query pattern notes and best practices
  - Instructions for adding new patterns

- **Agent Package Documentation**:
  - Complete API reference
  - Architecture documentation
  - Quick start guide
  - Security guidelines

### 🔧 Changed

- **Query Normalization**:
  - Automatic replacement of `users`, `teachers`, `students`, `staff` with `profiles`
  - Automatic addition of `profile_type` WHERE clauses
  - Automatic JOIN addition for organization name queries
  - Replacement of `role` with `profile_type` in profiles queries
  - Organization name normalization (removes " organization" suffix)

- **SQL Execution**:
  - Uses Supabase query builder for simple queries
  - Falls back to raw SQL via RPC for complex JOIN queries
  - Enhanced error handling and logging
  - Better result formatting with AI

- **Action Tools**:
  - Improved parameter extraction from natural language
  - Better email generation for new users (uses organization slug)
  - Enhanced full name generation
  - More robust organization ID passing in multi-step actions
  - Better error messages and validation

- **System Prompts**:
  - Explicit instructions about `profiles` table (not `users` or `teachers`)
  - Detailed examples for organization queries with JOINs
  - Language-specific instructions
  - Enhanced query examples for all entity types

### 🐛 Fixed

- **Query Issues**:
  - Fixed "Table 'users' is not accessible" errors (normalized to `profiles`)
  - Fixed "Table 'teachers' is not accessible" errors (normalized to `profiles`)
  - Fixed "column profiles.organization_name does not exist" (added JOIN logic)
  - Fixed "column 'role' does not exist" (replaced with `profile_type`)
  - Fixed organization name extraction (handles "Test organization" → "Test")

- **Multi-Step Actions**:
  - Fixed "Invalid email format" error for new users
  - Fixed "No organization" assignment for newly created admins
  - Improved organization ID passing between steps
  - Better email and password generation

- **UI Issues**:
  - Fixed widget maximize functionality after minimize
  - Improved header visibility when minimized
  - Better message count display
  - Fixed TypeScript errors in widget component

- **Language Detection**:
  - Fixed inconsistent language detection between English and Azerbaijani queries
  - Improved language matching for query responses

### 🗄️ Database

#### **New Migrations**
- `008_execute_sql_function.sql`: Creates PostgreSQL function for safe SQL execution with RLS

#### **New Functions**
- `execute_sql(query text)`: Allows execution of dynamic SELECT queries with RLS enforcement

### 📦 Package Updates

- **New Package**: `@eduator/agent` (v0.1.0)
  - Core agent system
  - SQL executor with RLS
  - Action tools
  - Security validators and guards

- **Updated Packages**:
  - `@eduator/ui`: Added `AIAgentWidget` component
  - `@eduator/db`: Added `executeRawQuery` method
  - `@eduator/core`: Enhanced types for agent responses

### 🔒 Security

- **Row-Level Security (RLS)**:
  - All SQL queries executed with user context
  - Platform Owners: Full access across all organizations
  - School Admins: Organization-scoped access only
  - RLS policies enforced at database level

- **SQL Injection Prevention**:
  - Only SELECT queries allowed
  - Query validation before execution
  - Parameterized queries via Supabase
  - Input sanitization

- **Action Tool Security**:
  - Role-based access control
  - Input validation for all parameters
  - Email format validation
  - Organization ID validation

### 📚 Documentation

- **New Documents**:
  - `packages/agent/docs/POSSIBLE_QUESTIONS.md`: Comprehensive query examples
  - `packages/agent/docs/ARCHITECTURE.md`: System architecture
  - `packages/agent/docs/QUICK_START.md`: Quick start guide
  - `packages/agent/docs/API_REFERENCE.md`: Complete API reference

- **Updated Documents**:
  - `packages/agent/README.md`: Enhanced with new features
  - `CHANGELOG.md`: Version 0.8.0 release notes

### 🚧 Future Enhancements

- [ ] Support for Teacher role (scoped to their classes)
- [ ] Support for Student role (personal data only)
- [ ] Advanced analytics and reporting tools
- [ ] Batch operations support
- [ ] Conversation memory and context retention
- [ ] Multi-turn task planning
- [ ] Natural language to complex query generation

---


## [0.5.0] - 2026-01-15

### 🎉 Major Release - Enhanced AI Chat with Multi-Language Support & Student Access

This release introduces a comprehensive AI chat system with automatic language detection, student access to teacher conversations, and improved conversation management.

### ✨ Added

#### **Universal AI Chat System**
- **Teacher Chat Interface** (`/teacher/chat`):
  - Conversation management with history
  - Document-based RAG (Retrieval Augmented Generation) for context-aware responses
  - Conversation naming dialog for better organization
  - Class assignment for conversations (enables student access)
  - Document selection per conversation
  - RAG toggle for enabling/disabling document context
  - Message history with sources and metadata
  - Follow-up suggestions based on conversation context

- **Student Chat Interface** (`/student/chat`):
  - Access to teacher conversations assigned to enrolled classes
  - View conversations from all enrolled classes
  - Chat with AI using teacher-assigned documents
  - Read-only access (cannot create/delete conversations)
  - Class name display for each conversation
  - Same RAG-powered responses as teachers

#### **Automatic Language Detection & Response**
- **Intelligent Language Detection**:
  - Automatically detects user's language from their message
  - Supports Azerbaijani, Russian, English, Turkish, Spanish, French, German
  - Updates system prompt dynamically based on detected language
  - Responds exclusively in the detected language

- **Multi-Language Chat**:
  - If user asks in Azerbaijani → responds in Azerbaijani
  - If user asks in Russian → responds in Russian
  - If user asks in English → responds in English
  - Automatic translation of document content to user's language
  - Language-specific system prompts for better context

#### **Conversation Management**
- **Conversation Naming Dialog**:
  - Custom title input when creating new conversations
  - Optional document selection during creation
  - Better organization with meaningful conversation names
  - No more generic "New Conversation" titles

- **Class Assignment**:
  - Teachers can assign conversations to classes
  - Students in assigned classes automatically see conversations
  - Enables collaborative learning with shared AI context
  - RLS policies ensure proper access control

#### **Database Schema Updates**
- **New Tables**:
  - `teacher_chat_conversations`: Stores conversation metadata with class assignment
  - `teacher_chat_messages`: Stores individual messages with metadata

- **New Columns**:
  - `class_id` in `teacher_chat_conversations` for class assignment
  - `document_ids` array for RAG document selection
  - `context` JSONB for conversation context (subject, grade level, etc.)
  - `metadata` JSONB in messages for tokens, model, sources

- **RLS Policies**:
  - Teachers can manage their own conversations
  - Students can view conversations from enrolled classes
  - Students can send messages in class conversations
  - Proper access control for all operations

#### **Universal Components**
- **Shared Chat Component** (`@eduator/ui`):
  - `TeacherChat` component works for both teachers and students
  - `isStudent` prop for role-based UI differences
  - Document selection hidden for students
  - Class name display for students
  - Consistent UI/UX across both roles

### 🔧 Changed

- **Chat Service Architecture**:
  - Refactored to use shared `TeacherChatbotService`
  - RAG integration with document-rag service
  - Vector embeddings for semantic search
  - Improved response quality with document context

- **Language Handling**:
  - Dynamic system prompt updates based on detected language
  - Language-specific instructions in prompts
  - Automatic translation of document content
  - Consistent language enforcement

- **UI/UX Improvements**:
  - Modern dialog for conversation creation
  - Better conversation list with class names
  - Improved message display with sources
  - Loading states and error handling
  - Responsive design for mobile and desktop

### 🐛 Fixed

- **Chat Functionality**:
  - Fixed conversation creation in ERP version
  - Resolved table name conflicts (teacher_chat vs chat)
  - Fixed RLS policy issues for student access
  - Improved error handling and logging

- **Language Detection**:
  - Fixed language detection edge cases
  - Improved fallback to English when detection fails
  - Better handling of mixed-language messages

### 🗄️ Database

#### **New Migrations**
- `010_teacher_chat.sql`: Creates teacher chat tables with RLS
- `011_teacher_chat_class_assignment.sql`: Adds class assignment support

#### **Storage**
- No new storage buckets (uses existing document storage)

### 📦 Package Updates

- `@eduator/ai`: Enhanced with `TeacherChatbotService` and language detection
- `@eduator/ui`: New `TeacherChat` universal component
- `@eduator/db`: New chat-related migrations

---


## [0.4.0] - 2026-01-14

### 🎉 Version 0.4.0 Release

This release continues to build upon the foundation established in previous versions with enhanced features and improvements.

### ✨ Added

- Enhanced document statistics tracking
- Improved database performance with new indexes
- Better error handling and logging across services

### 🔧 Changed

- Updated project version to 0.4.0
- Improved documentation and version references

### 🐛 Fixed

- Various bug fixes and stability improvements

### 🔄 Next Steps (v0.5.0)

- Student Portal features (exam taking, AI tutor, progress tracking)
- Real-time exam submissions and auto-grading
- Advanced analytics and reporting
- Email notifications
- Question bank management
- Adaptive testing
- Mobile applications

---


## [0.3.0] - 2026-01-14

### 🚀 Enhanced Lesson Generation & Audio Features

This release focuses on improving lesson generation with document-based content, enhanced audio capabilities, and better user experience.

### ✨ Added

#### **Enhanced Lesson Generation**
- **Document-Based Lesson Creation (RAG)**:
  - Generate lessons from uploaded documents using Retrieval Augmented Generation
  - Extract text from PDF documents for lesson content
  - Support for Markdown and Text files as source material
  - Intelligent content extraction and processing
  - Context-aware lesson generation based on document content

- **Audio Regeneration**:
  - Regenerate audio narration for existing lessons
  - Support for multiple languages in audio generation
  - Background audio processing for better performance
  - Audio URL updates without full lesson regeneration

#### **Enhanced Audio Player Component**
- **Advanced Audio Controls**:
  - Play/pause functionality with smooth transitions
  - Progress bar with click-to-seek capability
  - Current time and duration display
  - Volume mute/unmute controls
  - Time formatting (mm:ss)
  - Loading states and error handling

#### **Lesson Content Improvements**
- **Better Content Formatting**:
  - Improved HTML content generation
  - Support for center-aligned text option
  - Enhanced image integration within lesson content
  - Better structured content output

### 🔧 Changed

- **Lesson Generation Service**:
  - Refactored to use RAG pattern for document-based generation
  - Improved error handling for document processing
  - Better integration with Supabase Storage for document access
  - Enhanced content extraction from PDF files

- **Audio Generation**:
  - Background processing to improve response times
  - Better error handling and logging
  - Improved audio URL management
  - Support for dynamic audio regeneration

- **UI Components**:
  - Enhanced AudioPlayer component with better UX
  - Improved loading states and error messages
  - Better integration with lesson detail pages

### 🐛 Fixed

- **Document Processing**:
  - Fixed PDF file download and processing
  - Improved error handling when documents are not found
  - Better handling of file type validation

- **Audio Generation**:
  - Fixed audio URL update logic
  - Improved error handling in TTS generation
  - Better handling of missing content scenarios

---


## [0.2.0] - 2026-01-14

### 🎉 Major Release - Teacher Portal & AI-Powered Features

This release brings comprehensive teacher functionality including AI-powered exam generation, lesson creation, document management, and multi-language support.

### ✨ Added

#### **Teacher Dashboard** (`/teacher`)
- **Real-time Dashboard**: Shows actual data instead of placeholder content
  - Time-based personalized greeting (Good morning/afternoon/evening)
  - Statistics cards: Classes, Exams (published count), Documents, Lessons, Students
  - Recent Exams section with status, question count, points, and language flags
  - Recent Documents section with file type icons and quick view
  - Your Classes section with colorful cards and class details
  - Removed action buttons for cleaner design

#### **Document Management** (`/teacher/documents`)
- **Drag & Drop Upload**: Simple file upload interface directly on page
  - Support for PDF, Markdown (.md), and Text (.txt) files
  - File size limit of 10MB
  - Progress indicator during upload
  - Automatic title extraction from filename
- **Document Library**: Grid view with card-based layout
  - File type icons with color coding (PDF: red, MD: blue, TXT: amber)
  - File size and upload date display
  - Search and filter capabilities
- **Document Editing**: Post-upload editing dialog
  - Edit title and description
  - Assign to class
  - Delete with confirmation
- **Supabase Storage**: Documents stored in `documents` bucket

#### **AI-Powered Exam Generation** (`/teacher/exams/new`)
- **5-Step Wizard**: Generate → Translate → Edit → Assign → Publish
- **Document-Based Generation**:
  - Select multiple documents as source material
  - AI extracts content and generates relevant questions
- **Question Type Distribution**:
  - Configure exact count for each type: Multiple Choice, True/False, Short Answer, Fill-in-the-Blank
  - Advanced settings toggle for fine-grained control
- **Difficulty Distribution**:
  - Set counts for Easy, Medium, Hard questions
  - Or use "Mixed" mode for automatic distribution
  - Difficulty badges displayed on each question card
- **Multi-Language Support**:
  - Select source language for generation
  - Translate to 8+ languages: English, Azerbaijani, Russian, Turkish, German, French, Spanish, Arabic
  - Language flags with native names in selector
  - Retranslate button for updating translations
- **Live Question Editing**:
  - Edit question text, answers, correct answer
  - Change difficulty level per question
  - Add/remove questions
  - Points allocation per question
- **Summary Panel**:
  - Question type breakdown
  - Difficulty distribution chart
  - Total points calculation
  - Available languages display

#### **Exam Management** (`/teacher/exams`)
- **Enhanced List View**:
  - Direct action icons (View, Edit, Publish/Unpublish, Delete)
  - Language column with flag emojis for available translations
  - Status badges (Draft/Published)
  - Question count and total points
- **Exam Detail Page** (`/teacher/exams/[id]`):
  - Language switcher with flags
  - View questions in any available language
  - Difficulty badges on questions
  - Pagination for large exams
  - Edit, Delete, Publish actions

#### **Lesson Generation** (`/teacher/lessons/generate`)
- **AI-Powered Lesson Creation**:
  - Enter topic and select grade level
  - Choose output language with flag selector
  - Include/exclude images, audio narration, mini-test, examples
  - Duration setting
- **Generated Content**:
  - Rich HTML lesson content
  - AI-generated images (Google Imagen 3.0)
  - Text-to-Speech audio narration (Gemini TTS)
  - Auto-generated quiz questions
  - Practical examples
- **Auto-Redirect**: After generation, redirects to lesson detail page
- **Success Screen**: Shows lesson stats (images, quiz questions) before redirect

#### **Lesson Management** (`/teacher/lessons`)
- **Lesson Detail Page** (`/teacher/lessons/[id]`):
  - Tabbed content: Lesson, Images, Mini-Test, Examples
  - Expandable image cards
  - Audio player for narration
  - Edit dialog for lesson details
  - Regenerate Audio button
  - Publish/Unpublish toggle
  - Delete with confirmation

#### **Class Detail Page** (`/teacher/classes/[id]`)
- **Comprehensive Class View**:
  - Header with class name, status, description, subject, grade level
  - Copyable class code
  - Stats: Students, Exams, Documents, Lessons
- **Share Existing Content**:
  - Share Exams dialog (violet theme)
  - Share Documents dialog (amber theme)
  - Share Lessons dialog (emerald theme)
  - Multi-select with "Select All" option
- **Shared Content Lists**:
  - View all exams shared with class (with language flags)
  - View all documents shared with class
  - View all lessons shared with class
  - Remove (unlink) content from class
- **Enrolled Students**: Grid view of students with avatars
- **Quick Tips**: Helpful guidance for teachers

#### **Classes Page** (`/teacher/classes`)
- **Modern Card Design**:
  - 6 unique color schemes cycling through cards
  - Colored top border strip per card
  - "New" badge for recently created classes
  - Hover effects with shadow and icon scaling
  - Stats pills (students, subject, grade level)
  - View arrow appears on hover

#### **Teacher Reports & Settings**
- **Reports Page** (`/teacher/reports`):
  - Total classes, exams, documents, lessons statistics
  - Exam status breakdown
- **Settings Page** (`/teacher/settings`):
  - Profile information display
  - Organization details

#### **Navigation Updates**
- Reordered sidebar: Dashboard → Documents → Exams → Lessons → AI Chat → Classes → Reports → Settings
- Added icons for all navigation items

#### **AI Infrastructure**
- **Google Gemini Integration**:
  - Gemini 2.0 Flash for text generation
  - Support for both `GOOGLE_GEMINI_API_KEY` and `GOOGLE_GENERATIVE_AI_KEY`
  - Increased token limit (65536) for longer responses
- **Google Imagen 3.0 Integration**:
  - `imagen-3.0-generate-002` (primary)
  - `imagen-3.0-generate-001` (fallback)
  - Images stored in Supabase Storage
- **Text-to-Speech**: Gemini 2.5 Flash Preview TTS for lesson audio
- **Translation Service**: AI-powered translation with context preservation

### 🎨 UI/UX Improvements

#### **Role-Based Color Scheme**
- **Platform Owner**: Red theme
- **School Admin**: Orange theme
- **Teacher**: Blue theme
- **Student**: Blue accents

#### **Modern Dialogs & Modals**
- Gradient headers matching context color
- `rounded-2xl` corners
- `backdrop-blur-sm` overlay
- `animate-in` animations
- Mobile-responsive button layouts (`flex-col-reverse sm:flex-row`)
- Loading states with spinners
- Success states with checkmarks

#### **Confirmation Dialogs**
- Reusable `ConfirmDialog` component
- Type variants: danger (red), warning (yellow), info (blue), success (green)
- Icon support
- Loading text customization

#### **Mobile Responsiveness**
- All pages optimized for mobile
- Responsive grids and layouts
- Touch-friendly buttons
- Collapsible navigation

### 🐛 Fixed

- **Hydration Mismatch**: Fixed image array ordering in lesson content
- **RLS Recursion**: Resolved infinite recursion in Row-Level Security policies
- **API Key Detection**: Support for multiple environment variable names
- **Token Limit**: Increased to prevent truncated AI responses
- **Image Generation**: Fixed model configuration for Google Imagen API
- **TypeScript Errors**: Fixed implicit `any` types across components

### 🔧 Changed

- Body size limit for Server Actions increased to 10MB
- Added `flagcdn.com` to Next.js image domains
- Updated AI model configuration in `@eduator/config`
- Improved error logging throughout

### 🗄️ Database

#### **New Tables**
- `documents`: Teacher document storage with RLS

#### **Updated Tables**
- `exams`: Added `language` and `translations` columns
- `lessons`: Added extended columns for AI-generated content

#### **Storage Buckets**
- `documents`: For uploaded files
- `lesson-images`: For AI-generated lesson images

### 📦 Package Updates

- `@eduator/ai`: Enhanced with Imagen 3.0 and TTS support
- `@eduator/config`: Updated AI model configurations
- `@eduator/db`: New documents repository

---


## [0.1.0] - 2025-01-27

### 🎉 Initial Release - Foundation & Core Features

This is the first stable release of Eduator AI v2.0, establishing the foundation for the educational platform with comprehensive administration and management capabilities.

### ✨ Added

#### **Platform Infrastructure**
- Monorepo structure with Turborepo for efficient builds
- Next.js 15 with App Router for both ERP and ERP applications
- TypeScript 5.7 with strict type checking
- Supabase integration for authentication and database
- Fastify API server with OpenAPI documentation
- Shared packages architecture for code reusability

#### **Authentication & Authorization**
- Supabase Auth integration with JWT tokens
- Role-based access control (RBAC) with 4 roles:
  - Platform Owner (full platform access)
  - School Admin (organization management)
  - Teacher (exam creation, class management)
  - Student (exam taking, AI tutor)
- Middleware-based route protection
- Session management with cookie handling
- Approval workflow for user registration
- Password management and reset functionality

#### **Database Schema**
- Complete PostgreSQL schema with:
  - Organizations table with subscription plans
  - Profiles table with role-based access
  - Classes table with teacher assignments
  - Class enrollments and teacher assignments
  - Exams and exam submissions
  - Lessons and chat history
- Row-Level Security (RLS) policies for data protection
- Database triggers for automatic profile creation
- Performance indexes for optimized queries
- Security definer functions for RLS bypass where needed

#### **ERP Application (Platform Owner)**
- **Dashboard**: Overview with statistics and quick actions
- **Organizations Management**:
  - List view with search and filtering
  - Create new organizations with subscription plans
  - Edit organization details (name, type, subscription, status)
  - View organization details
  - Add school admins to organizations
  - Delete organizations
- **Users Management**:
  - Comprehensive user list with search and filters
  - View user details
  - Edit user information (name, role, organization, approval status)
  - Approve/reject user registrations
  - Change user passwords
  - Delete users
  - Statistics dashboard (total users, by role, by status)
- **Reports**:
  - Platform-wide analytics with visual charts
  - Bar charts for subscription plans, organization status, approval status
  - Donut chart for user distribution
  - Export capabilities (UI ready)
- **Settings**: Placeholder page for future configuration
- **Landing Pages**:
  - Home page with feature highlights
  - About page with mission and values
  - Services page with feature descriptions
  - Pricing page with subscription tiers

#### **ERP Application (School Admin)**
- **Dashboard**: Organization-specific overview
- **Users Management**:
  - Add new teachers and students to organization
  - Auto-approval for organization users
  - Edit user details (name, email, role)
  - Change user passwords
  - Approve/reject users
  - Delete users
  - Search and filter capabilities
  - Statistics display
  - **Improved UX**: Visible action icons (view, edit, approve, reject, delete) instead of dropdown menu
- **Classes Management**:
  - List all classes with search and filters
  - Create new classes with teacher assignment
  - View class details with enrolled students and assigned teachers
  - Edit class information
  - Enroll/unenroll students
  - Add/remove multiple teachers to classes
  - Class code generation and sharing
  - Statistics (teachers count, students count)
- **Reports**: Analytics dashboard for organization
- **Settings**:
  - Organization location management (address, city, country)
  - Contact information (phone, website)
  - Organization details display

#### **UI/UX Improvements**
- Consistent design system across all pages
- Responsive layouts for mobile and desktop
- Modern card-based layouts
- Color-coded status indicators
- Loading states and error handling
- Form validation and user feedback
- Accessible components with proper ARIA labels
- Smooth transitions and hover effects

#### **Shared Packages**
- `@eduator/config`: Environment configuration and constants
- `@eduator/core`: TypeScript types, validation schemas, stores, hooks
- `@eduator/auth`: Supabase authentication utilities
- `@eduator/db`: Database repositories and migrations
- `@eduator/ai`: Google Gemini AI integration (structure ready)
- `@eduator/api-client`: HTTP client with React Query hooks
- `@eduator/api-server`: Fastify REST API with role-based routes
- `@eduator/ui`: Reusable React components

#### **Developer Experience**
- TypeScript strict mode enabled
- ESLint and Prettier configuration
- Hot module replacement for fast development
- Clear error messages and debugging tools
- Comprehensive type definitions
- API documentation at `/docs` endpoint

### 🔧 Changed

- Updated login page branding from "Admin Portal" to "ERP Portal"
- Moved location information from Platform Owner to School Admin settings
- Improved user action buttons with visible icons instead of dropdown menus
- Enhanced class detail page with better teacher and student management
- Updated navigation to include About, Services, and Pricing pages

### 🐛 Fixed

- Resolved login redirect loops by fixing cookie handling consistency
- Fixed RLS recursion issues with security definer functions
- Fixed duplicate key errors when creating users (handled trigger-created profiles)
- Fixed TypeScript errors with icon components in Server Components
- Fixed teacher assignment duplication in class creation
- Resolved TypeScript configuration issues in monorepo packages

### 🔒 Security

- Row-Level Security (RLS) policies on all tables
- JWT-based authentication with Supabase
- Secure password handling
- Admin client for privileged operations
- Input validation on all forms
- SQL injection prevention through parameterized queries

### 📚 Documentation

- Comprehensive README with setup instructions
- API documentation via OpenAPI/Swagger
- Code comments and type definitions
- Environment variable documentation

---


## [Unreleased]

---

[0.17.16]: https://github.com/your-repo/releases/tag/v0.17.16
[0.17.10]: https://github.com/your-repo/releases/tag/v0.17.10
[0.17.9]: https://github.com/your-repo/releases/tag/v0.17.9
[0.17.7]: https://github.com/your-repo/releases/tag/v0.17.7
[0.17.5]: https://github.com/your-repo/releases/tag/v0.17.5
[0.17.0]: https://github.com/your-repo/releases/tag/v0.17.0
[0.16.0]: https://github.com/your-repo/releases/tag/v0.16.0
[0.15.5]: https://github.com/your-repo/releases/tag/v0.15.5
[0.15.0]: https://github.com/your-repo/releases/tag/v0.15.0
[0.14.0]: https://github.com/your-repo/releases/tag/v0.14.0
[0.13.0]: https://github.com/your-repo/releases/tag/v0.13.0
[0.12.0]: https://github.com/your-repo/releases/tag/v0.12.0
[0.11.2]: https://github.com/your-repo/releases/tag/v0.11.2
[0.11.0]: https://github.com/your-repo/releases/tag/v0.11.0
[0.10.0]: https://github.com/your-repo/releases/tag/v0.10.0
[0.9.6]: https://github.com/your-repo/releases/tag/v0.9.6
[0.8.0]: https://github.com/your-repo/releases/tag/v0.8.0
[0.8.1]: https://github.com/your-repo/releases/tag/v0.8.1
[0.7.5]: https://github.com/your-repo/releases/tag/v0.7.5
[0.7.0]: https://github.com/your-repo/releases/tag/v0.7.0
[0.6.0]: https://github.com/your-repo/releases/tag/v0.6.0
[0.5.0]: https://github.com/your-repo/releases/tag/v0.5.0
[0.4.0]: https://github.com/your-repo/releases/tag/v0.4.0
[0.3.0]: https://github.com/your-repo/releases/tag/v0.3.0
[0.2.0]: https://github.com/your-repo/releases/tag/v0.2.0
[0.1.0]: https://github.com/your-repo/releases/tag/v0.1.0
