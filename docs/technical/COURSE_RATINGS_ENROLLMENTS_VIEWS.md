# Course ratings, enrollments, and view count

## Current state (Supabase)

- **courses**: Has `id`, `access_code`, `created_by`, `title`, etc. **No** rating, enrollment, or view data.
- **teacher_ratings**: Exists for **teachers** (student_id, teacher_id, score, feedback_text). Nothing equivalent for courses.
- **class_enrollments**: Students enroll in **classes** (class_id, student_id). There is **no** enrollment table for **courses** (shareable courses with access_code).
- **Views**: No table or column tracking how many times a course page was viewed.

## Goal

Make courses more valuable and comparable by showing:

1. **Rating** – Average stars + count (e.g. “4.5 (12 ratings)”), and allow students to rate a course (1–5 + optional comment).
2. **Enrolled** – Number of students who joined the course (e.g. “24 enrolled”).
3. **Viewed** – Number of page views for the shareable course page (e.g. “156 views”).

## Schema changes

### 1. `course_ratings`

Same idea as `teacher_ratings`, but for courses:

- `id` (UUID, PK)
- `course_id` (UUID, FK → courses.id)
- `student_id` (UUID, FK → profiles.id, profile_type = student)
- `score` (smallint, 1–5)
- `feedback_text` (text, nullable)
- `created_at`, `updated_at` (timestamptz)
- **Unique** on `(course_id, student_id)` so one rating per student per course (re-rating updates).

RLS: public read for listing/summary; only authenticated students can insert/update their own row.

### 2. `course_enrollments`

Tracks which students have “joined” a course (e.g. after entering access code or clicking “Get access” while signed in):

- `id` (UUID, PK)
- `course_id` (UUID, FK → courses.id)
- `student_id` (UUID, FK → profiles.id)
- `enrolled_at` (timestamptz)
- **Unique** on `(course_id, student_id)`.

RLS: public read for count; only authenticated students can insert their own enrollment.

### 3. `courses.view_count`

Add column to existing `courses` table:

- `view_count` (integer, default 0, not null).

Increment in a server action when the shareable course page is viewed (e.g. once per session or per load, depending on product choice). Use a Supabase RPC or backend update so the increment is atomic.

## Migration SQL

See `COURSE_RATINGS_ENROLLMENTS_VIEWS.sql` in this folder. Run it in the Supabase SQL editor (or your migration pipeline) to:

- Create `course_ratings` with RLS.
- Create `course_enrollments` with RLS.
- Add `view_count` to `courses`.
- Optionally add an RPC to increment `view_count` (or do the increment from the app with an update).

## App implementation (outline)

- **Course rating**: Server actions `submitCourseRating(courseId, score, feedbackText)`, `getCourseRatingSummary(courseId)`, `getMyRatingForCourse(courseId)`; UI on `/c/[accessCode]` and on Find Courses cards (stars + count).
- **Enrolled**: When a logged-in student lands on `/c/[accessCode]` (or clicks “Get access” and is already signed in), call an action that upserts into `course_enrollments`. Expose `getCourseEnrollmentCount(courseId)` and show “X enrolled” on the course page and on cards.
- **Views**: On `/c/[accessCode]` page load, call an action that increments `courses.view_count` for that course (e.g. once per session via cookie or similar). Show “X views” on the course page and on Find Courses cards.

**Implemented (ERP shareable course page):**

- **Shareable course page** (`/c/[accessCode]`): Shows rating (stars + count), enrolled count, view count, and "Rate this course" (modal with stars + optional comment). On page load: view count is incremented (RPC) and logged-in students are recorded as enrolled. See `apps/erp-app/src/app/c/[accessCode]/actions.ts` and `course-stats-and-rating.tsx`.
- **Find Courses directory**: Can be extended later to show rating, enrolled, and views on each course card by bulk-fetching these stats in `getPublicCourses` (and selecting `view_count` from `courses`).
