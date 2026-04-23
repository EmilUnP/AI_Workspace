# Student Assistant – Database Requirements

This document lists the database tables and columns required for the **Student Assistant** feature (wizard + AI, progress, today’s activity, scores). Ensure your Supabase (or DB) schema includes these.

---

## Required tables and columns

### 1. `class_enrollments`
**Purpose:** Student–class membership (used for “my classes”, upcoming exams, lessons, updates).

| Column       | Type      | Notes                          |
|-------------|-----------|--------------------------------|
| id          | UUID      | PK                             |
| class_id    | UUID      | FK → classes(id)               |
| student_id  | UUID      | FK → profiles(id)              |
| status      | VARCHAR   | Use `'active'` for enrolled   |
| enrolled_at | TIMESTAMPTZ | Optional                    |

**Usage:** Assistant uses `class_enrollments` with `status = 'active'` to get a student’s class IDs, then queries exams, lessons, and updates for those classes.

---

### 2. `lesson_progress`
**Purpose:** Per-student lesson completion and time spent (today’s activity, progress step, Study Pulse).

| Column             | Type        | Notes                                |
|--------------------|-------------|--------------------------------------|
| id                 | UUID        | PK                                   |
| lesson_id          | UUID        | FK → lessons(id)                     |
| student_id         | UUID        | FK → profiles(id)                    |
| time_spent_seconds | INTEGER     | Used for “total minutes” in progress |
| completed_at       | TIMESTAMPTZ | Nullable; set when lesson completed  |
| started_at         | TIMESTAMPTZ | Optional                             |
| current_section    | INTEGER     | Optional                             |
| completed_sections | JSONB/ARRAY | Optional                             |
| notes              | TEXT        | Optional                             |

**Usage:**
- **Today’s activity:** rows where `student_id = ?` and `completed_at` is between start and end of today.
- **Progress:** count completed lessons, sum `time_spent_seconds` for total study time.

**If missing:** Create the table and ensure the lesson view/detail flow calls `upsertLessonCompletion` (or equivalent) when a student marks a lesson complete.

---

### 3. `exam_submissions`
**Purpose:** Exam attempts and scores (today’s activity, average score, progress).

| Column       | Type        | Notes                                  |
|-------------|-------------|----------------------------------------|
| id          | UUID        | PK                                     |
| exam_id     | UUID        | FK → exams(id)                         |
| student_id  | UUID        | FK → profiles(id)                      |
| score       | NUMERIC/INT | Nullable; percentage or points         |
| created_at  | TIMESTAMPTZ | Used for “did exam today” and ordering |
| submitted_at| TIMESTAMPTZ | Optional; can use instead of created_at |

**Usage:**
- **Today’s activity:** rows where `student_id = ?` and `created_at` (or `submitted_at`) is today.
- **Progress / scores:** `getAvailableExams` (or equivalent) joins to exam_submissions to compute `has_submitted` and `best_score` per exam; assistant uses these for average score and Study Pulse.

**If missing:** Assistant will show “No exams taken yet” and today’s activity will not count exams.

---

### 4. `exams`
**Purpose:** Upcoming exams list and class updates.

Required columns (already in main schema): `id`, `organization_id`, `class_id`, `created_by`, `title`, `duration_minutes`, `is_published`, `is_archived`, `created_at`.  
Optional: `course_generated` (0 or 1) to filter out course-generated exams when listing “standalone” exams.

---

### 5. `lessons`
**Purpose:** Lessons list and class updates.

Required columns: `id`, `organization_id`, `class_id`, `created_by`, `title`, `is_archived`, `created_at`.  
Optional: `course_generated` to align with how the rest of the app filters lessons.

---

## Optional: streak (future)

For a **study streak** (e.g. “X day streak” in the Progress step), you need:

- Either: distinct dates from `lesson_progress.completed_at` and `exam_submissions.created_at` (or `submitted_at`) for the student, then compute consecutive calendar days.
- Or: a dedicated `student_streaks` (or similar) table updated by a job when activity is recorded.

Currently the assistant shows `streakDays: 0` until this is implemented.

---

## Consistency: `class_enrollments` only

- The codebase (Student Assistant, student-lessons, student-exams, and **`packages/db/repositories/lessons.ts`**) uses **`class_enrollments`** with `status = 'active'` for enrolled students.
- Ensure your DB has the **`class_enrollments`** table. If you previously had only `class_students`, migrate or add a view so that enrollment is exposed as `class_enrollments`.

---

## Quick verification queries

Run against your DB (replace `'student-profile-uuid'` with a real student `profiles.id`):

```sql
-- 1. Enrolled classes (class_enrollments)
SELECT class_id FROM class_enrollments
WHERE student_id = 'student-profile-uuid' AND status = 'active';

-- 2. Today's lesson completions (lesson_progress)
SELECT lesson_id FROM lesson_progress
WHERE student_id = 'student-profile-uuid'
  AND completed_at >= date_trunc('day', now())
  AND completed_at <  date_trunc('day', now()) + interval '1 day';

-- 3. Today's exam submissions (exam_submissions)
SELECT id FROM exam_submissions
WHERE student_id = 'student-profile-uuid'
  AND created_at >= date_trunc('day', now())
  AND created_at <  date_trunc('day', now()) + interval '1 day';

-- 4. Scores for progress (exam_submissions)
SELECT exam_id, score FROM exam_submissions
WHERE student_id = 'student-profile-uuid' AND score IS NOT NULL;
```

If any of these fail (e.g. relation does not exist), add the missing table or columns as above.
