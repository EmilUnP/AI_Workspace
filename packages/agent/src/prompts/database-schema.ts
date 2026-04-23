/**
 * Real Database Schema Documentation for AI Agent
 * This is the ACTUAL database structure - use this for generating SQL queries
 */

export const DATABASE_SCHEMA = `
## DATABASE SCHEMA - Eduator AI

### CRITICAL: User Data Structure

**IMPORTANT**: There is NO separate "users" or "teachers" table. ALL users are stored in the \`profiles\` table.

- **Teachers** are: \`profiles\` WHERE \`profile_type = 'teacher'\`
- **Students** are: \`profiles\` WHERE \`profile_type = 'student'\`
- **School Admins** are: \`profiles\` WHERE \`profile_type = 'school_superadmin'\`
- **Platform Owners** are: \`profiles\` WHERE \`profile_type = 'platform_owner'\`

### Tables

#### 1. organizations
**Purpose**: Schools, universities, institutions (multi-tenant organizations)

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`name\` (VARCHAR) - Organization name
- \`slug\` (VARCHAR, UNIQUE) - URL slug
- \`type\` (VARCHAR) - 'school', 'university', 'institution', 'academy', 'other'
- \`email\` (VARCHAR) - Contact email
- \`phone\` (VARCHAR, nullable)
- \`address\`, \`city\`, \`country\` (nullable)
- \`website\` (VARCHAR, nullable)
- \`logo_url\` (TEXT, nullable)
- \`subscription_plan\` (VARCHAR) - 'basic', 'premium', 'enterprise'
- \`status\` (VARCHAR) - 'active', 'suspended', 'inactive'
- \`settings\`, \`metadata\` (JSONB)
- \`created_at\`, \`updated_at\` (TIMESTAMPTZ)

#### 2. profiles
**Purpose**: ALL user accounts - teachers, students, admins, platform owners

**Columns** (VERIFIED FROM ACTUAL DATABASE):
- \`id\` (UUID, PRIMARY KEY, default: uuid_generate_v4())
- \`user_id\` (UUID, UNIQUE, NOT NULL) - References auth.users(id)
- \`profile_type\` (VARCHAR, NOT NULL) - 'platform_owner', 'school_superadmin', 'teacher', 'student'
  - **CHECK constraint**: Must be one of these values
- \`organization_id\` (UUID, nullable) - References organizations(id)
- \`full_name\` (VARCHAR, NOT NULL) - **NOT "name" or "first_name/last_name"**
- \`email\` (VARCHAR, NOT NULL)
- \`avatar_url\` (TEXT, nullable)
- \`phone\` (VARCHAR, nullable)
- \`approval_status\` (VARCHAR, NOT NULL, default: 'pending') - 'pending', 'approved', 'rejected'
- \`is_active\` (BOOLEAN, NOT NULL, default: true)
- \`metadata\` (JSONB, nullable, default: '{}') - Additional data (bio, department, etc.)
- \`registration_info\` (JSONB, nullable)
- \`source\` (VARCHAR, nullable, default: 'erp') - 'erp', 'api'
- \`created_at\` (TIMESTAMPTZ, NOT NULL, default: now())
- \`updated_at\` (TIMESTAMPTZ, NOT NULL, default: now())

**CRITICAL NOTES**:
- **NO "name" column** - Use \`full_name\` instead
- **NO "first_name" or "last_name"** - Only \`full_name\` exists
- **NO "role" column** - Use \`profile_type\` instead
- **NO "organization_name" column** - Must JOIN with organizations table to get organization name

**How to query users by role** (VERIFIED PATTERNS):
- All users: \`SELECT * FROM profiles WHERE is_active = true AND approval_status = 'approved'\`
- Teachers only: \`SELECT * FROM profiles WHERE profile_type = 'teacher' AND is_active = true AND approval_status = 'approved'\`
- Students only: \`SELECT * FROM profiles WHERE profile_type = 'student' AND is_active = true AND approval_status = 'approved'\`
- Active teachers: \`SELECT * FROM profiles WHERE profile_type = 'teacher' AND is_active = true AND approval_status = 'approved'\`

**CRITICAL**: Always include both \`is_active = true\` AND \`approval_status = 'approved'\` filters for active users

#### 3. classes
**Purpose**: Classes/grades with assigned teachers

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`organization_id\` (UUID) - References organizations(id)
- \`teacher_id\` (UUID, nullable) - References profiles(id) - the main teacher
- \`name\` (VARCHAR) - Class name (e.g., "Math 101")
- \`description\` (TEXT, nullable)
- \`subject\` (VARCHAR, nullable)
- \`grade_level\` (VARCHAR, nullable)
- \`academic_year\` (VARCHAR, nullable)
- \`semester\` (VARCHAR, nullable)
- \`class_code\` (VARCHAR, UNIQUE) - Unique class code
- \`is_active\` (BOOLEAN)
- \`settings\` (JSONB)
- \`created_at\`, \`updated_at\` (TIMESTAMPTZ)

#### 4. class_enrollments
**Purpose**: Links students to classes (many-to-many relationship)

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`class_id\` (UUID) - References classes(id)
- \`student_id\` (UUID) - References profiles(id) WHERE profile_type = 'student'
- \`enrolled_at\` (TIMESTAMPTZ)
- \`status\` (VARCHAR) - 'active', 'pending', 'dropped', 'completed' (pending = join requested, awaiting teacher confirm)

**Example**: To get all students in a class:
\`\`\`sql
SELECT p.* FROM profiles p
JOIN class_enrollments ce ON ce.student_id = p.id
WHERE ce.class_id = 'class-uuid' AND ce.status = 'active'
AND p.profile_type = 'student'
\`\`\`

#### 5. class_teachers
**Purpose**: Additional teachers assigned to classes (if a class has multiple teachers)

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`class_id\` (UUID) - References classes(id)
- \`teacher_id\` (UUID) - References profiles(id) WHERE profile_type = 'teacher'
- \`role\` (VARCHAR, nullable) - Default 'teacher'
- \`assigned_at\` (TIMESTAMPTZ)

#### 6. exams
**Purpose**: Exams/quizzes created by teachers

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`organization_id\` (UUID) - References organizations(id)
- \`class_id\` (UUID, nullable) - References classes(id)
- \`created_by\` (UUID) - References profiles(id) - the teacher who created it
- \`title\` (VARCHAR)
- \`description\` (TEXT, nullable)
- \`subject\`, \`grade_level\` (VARCHAR, nullable)
- \`settings\`, \`questions\` (JSONB)
- \`duration_minutes\` (INTEGER, default 60)
- \`is_published\`, \`is_archived\` (BOOLEAN)
- \`start_time\`, \`end_time\` (TIMESTAMPTZ, nullable)
- \`language\` (VARCHAR, default 'en')
- \`translations\` (JSONB)
- \`metadata\` (JSONB)
- \`created_at\`, \`updated_at\` (TIMESTAMPTZ)

#### 7. exam_submissions
**Purpose**: Student exam submissions/results

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`exam_id\` (UUID) - References exams(id)
- \`student_id\` (UUID) - References profiles(id)
- \`answers\` (JSONB)
- \`started_at\`, \`submitted_at\` (TIMESTAMPTZ)
- \`time_spent_seconds\` (INTEGER)
- \`score\`, \`percentage\` (nullable)
- \`is_passed\` (BOOLEAN, nullable)
- \`attempt_number\` (INTEGER, default 1)
- \`status\` (VARCHAR) - 'in_progress', 'submitted', 'graded', 'reviewed'
- \`feedback\` (TEXT, nullable)
- \`graded_by\` (UUID, nullable) - References profiles(id)
- \`graded_at\` (TIMESTAMPTZ, nullable)
- \`created_at\` (TIMESTAMPTZ)

#### 7b. lesson_progress
**Purpose**: Tracks student progress on lessons (completion, time spent)

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`lesson_id\` (UUID) - References lessons(id)
- \`student_id\` (UUID) - References profiles(id) WHERE profile_type = 'student'
- \`current_section\` (INTEGER)
- \`completed_sections\` (JSONB/ARRAY)
- \`time_spent_seconds\` (INTEGER)
- \`started_at\` (TIMESTAMPTZ)
- \`completed_at\` (TIMESTAMPTZ, nullable) - When the student marked the lesson complete
- \`notes\` (TEXT, nullable)
- \`created_at\`, \`updated_at\` (TIMESTAMPTZ if present)

**Used by**: Student Assistant (today's activity, progress), course run completion, progress pages.

#### 8. lessons
**Purpose**: AI-generated lessons with content, images, audio

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`organization_id\` (UUID) - References organizations(id)
- \`class_id\` (UUID, nullable) - References classes(id)
- \`created_by\` (UUID) - References profiles(id)
- \`title\`, \`description\` (VARCHAR/TEXT)
- \`subject\`, \`grade_level\` (VARCHAR, nullable)
- \`duration_minutes\` (INTEGER, default 45)
- \`content\`, \`learning_objectives\`, \`prerequisites\`, \`materials\` (JSONB)
- \`images\` (JSONB) - Array of AI-generated images
- \`audio_url\` (TEXT, nullable) - TTS audio narration
- \`mini_test\` (JSONB) - Quiz questions
- \`document_id\` (UUID, nullable) - References documents(id)
- \`topic\` (VARCHAR, nullable)
- \`language\` (VARCHAR(10), default 'en') - Primary lesson language (e.g. en, az); add via migration if missing
- \`is_published\`, \`is_archived\` (BOOLEAN)
- \`metadata\` (JSONB)
- \`created_at\`, \`updated_at\` (TIMESTAMPTZ)

#### 9. courses
**Purpose**: Self-paced courses generated by AI Curriculum Architect (multi-lesson courses)

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`organization_id\` (UUID) - References organizations(id)
- \`created_by\` (UUID) - References profiles(id) - the teacher who created it
- \`title\` (VARCHAR) - Course title
- \`description\` (TEXT, nullable) - Course description
- \`subject\`, \`grade_level\` (VARCHAR, nullable)
- \`difficulty_level\` (VARCHAR) - 'grade_1' through 'grade_12', 'undergraduate', 'graduate', 'phd'
- \`language\` (VARCHAR, default 'en') - Course language
- \`course_style\` (VARCHAR, default 'serious_academic') - 'serious_academic' or 'fun_gamified'
- \`access_code\` (VARCHAR(6), UNIQUE) - 6-digit access code for students
- \`lesson_ids\` (JSONB) - Array of lesson UUIDs in order
- \`total_lessons\` (INTEGER, default 0) - Number of lessons in the course
- \`estimated_duration_minutes\` (INTEGER, default 0) - Total estimated duration
- \`is_published\`, \`is_archived\` (BOOLEAN)
- \`metadata\` (JSONB) - Visual gaps, source documents, AI model info, etc.
- \`created_at\`, \`updated_at\` (TIMESTAMPTZ)

#### 10. documents
**Purpose**: PDF/Markdown/Text documents uploaded by teachers

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`organization_id\` (UUID) - References organizations(id)
- \`created_by\` (UUID) - References profiles(id)
- \`class_id\` (UUID, nullable) - References classes(id)
- \`title\`, \`description\` (VARCHAR/TEXT)
- \`file_name\`, \`file_path\`, \`file_url\` (VARCHAR/TEXT)
- \`file_size\` (INTEGER)
- \`mime_type\`, \`file_type\` (VARCHAR) - 'pdf', 'markdown', 'text'
- \`tags\` (TEXT[])
- \`is_public\`, \`is_archived\` (BOOLEAN)
- \`extracted_text\`, \`text_chunks\`, \`chunk_embeddings\` (TEXT/JSONB) - For RAG
- \`processing_status\` (VARCHAR) - 'pending', 'processing', 'completed', 'failed'
- \`metadata\` (JSONB)
- \`created_at\`, \`updated_at\` (TIMESTAMPTZ)

#### 10. chat_conversations
**Purpose**: Student AI tutor conversations

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`student_id\` (UUID) - References profiles(id) WHERE profile_type = 'student'
- \`class_id\` (UUID, nullable) - References classes(id)
- \`title\` (VARCHAR, nullable)
- \`context\` (JSONB)
- \`is_active\` (BOOLEAN)
- \`created_at\`, \`updated_at\` (TIMESTAMPTZ)

#### 11. chat_messages
**Purpose**: Individual messages in student conversations

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`conversation_id\` (UUID) - References chat_conversations(id)
- \`role\` (VARCHAR) - 'user', 'assistant', 'system'
- \`content\` (TEXT)
- \`metadata\` (JSONB)
- \`created_at\` (TIMESTAMPTZ)

#### 12. teacher_chat_conversations
**Purpose**: Teacher AI assistant conversations

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`teacher_id\` (UUID) - References profiles(id) WHERE profile_type = 'teacher'
- \`organization_id\` (UUID, nullable) - References organizations(id)
- \`class_id\` (UUID, nullable) - References classes(id)
- \`title\` (VARCHAR, nullable)
- \`context\`, \`document_ids\` (JSONB/ARRAY) - For RAG context
- \`is_active\` (BOOLEAN)
- \`created_at\`, \`updated_at\` (TIMESTAMPTZ)

#### 13. teacher_chat_messages
**Purpose**: Individual messages in teacher conversations

**Columns**:
- \`id\` (UUID, PRIMARY KEY)
- \`conversation_id\` (UUID) - References teacher_chat_conversations(id)
- \`role\` (VARCHAR) - 'user', 'assistant', 'system'
- \`content\` (TEXT)
- \`metadata\` (JSONB)
- \`created_at\` (TIMESTAMPTZ)

### Common Query Patterns

#### Get all teachers in an organization (by organization name - USE ILIKE for case-insensitive matching):
\`\`\`sql
SELECT p.* FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE o.name ILIKE '%organization-name%'
AND p.profile_type = 'teacher'
AND p.is_active = true
AND p.approval_status = 'approved'
ORDER BY p.created_at DESC
\`\`\`

**CRITICAL**: When querying by organization name:
- Use \`ILIKE\` (case-insensitive) instead of \`=\` for better matching
- Use \`ILIKE '%name%'\` for partial matching (e.g., "test" matches "Test Organization")
- Use \`ILIKE 'name'\` for exact match (case-insensitive)
- Example: \`WHERE o.name ILIKE '%test%'\` will match "Test", "test", "Test Organization", etc.

#### Get all teachers in an organization (by organization ID):
\`\`\`sql
SELECT * FROM profiles
WHERE organization_id = 'org-uuid'
AND profile_type = 'teacher'
AND is_active = true
AND approval_status = 'approved'
ORDER BY created_at DESC
\`\`\`

#### Get all students in an organization:
\`\`\`sql
SELECT * FROM profiles
WHERE organization_id = 'org-uuid'
AND profile_type = 'student'
AND is_active = true
AND approval_status = 'approved'
ORDER BY created_at DESC
\`\`\`

#### Get count of teachers:
\`\`\`sql
SELECT COUNT(*) as teacher_count
FROM profiles
WHERE profile_type = 'teacher'
AND is_active = true
AND approval_status = 'approved'
-- Add organization filter for school admins:
-- AND organization_id = 'org-uuid'
\`\`\`

#### Get all users (across all roles):
\`\`\`sql
SELECT * FROM profiles
WHERE is_active = true
AND approval_status = 'approved'
ORDER BY profile_type, created_at DESC
\`\`\`

#### Get students enrolled in a class:
\`\`\`sql
SELECT p.* FROM profiles p
INNER JOIN class_enrollments ce ON ce.student_id = p.id
WHERE ce.class_id = 'class-uuid'
AND ce.status = 'active'
AND p.profile_type = 'student'
AND p.is_active = true
\`\`\`

#### Count exams and lessons created by a teacher (by email):
**IMPORTANT**: "have", "created by", "belongs to" all mean the same - use \`created_by\` column.

**CRITICAL**: Count ALL exams/lessons (including unpublished and archived) unless user specifically asks for "published" or "active" only.

\`\`\`sql
-- Get both counts in one query (RECOMMENDED):
SELECT 'exams' as type, COUNT(*) as count
FROM exams e
JOIN profiles p ON e.created_by = p.id
WHERE p.email = 'muallim2@bdu.az' AND p.profile_type = 'teacher'
UNION ALL
SELECT 'lessons' as type, COUNT(*) as count
FROM lessons l
JOIN profiles p ON l.created_by = p.id
WHERE p.email = 'muallim2@bdu.az' AND p.profile_type = 'teacher'

-- If user asks for total count, use:
SELECT 
  (SELECT COUNT(*) FROM exams e JOIN profiles p ON e.created_by = p.id WHERE p.email = 'muallim2@bdu.az' AND p.profile_type = 'teacher') +
  (SELECT COUNT(*) FROM lessons l JOIN profiles p ON l.created_by = p.id WHERE p.email = 'muallim2@bdu.az' AND p.profile_type = 'teacher')
  as total_count

-- Only add these filters if user explicitly asks for "published" or "active":
-- AND e.is_published = true
-- AND e.is_archived = false
\`\`\`

#### Count AND List exams/lessons with titles (by teacher email):
**When user asks for both count AND list with names/titles, use UNION ALL with matching columns:**

\`\`\`sql
-- Get counts and lists in one query (all columns must match):
SELECT 'exams_count' as type, COUNT(*)::text as value, NULL::text as title
FROM exams e
JOIN profiles p ON e.created_by = p.id
WHERE p.email = 'muallim2@bdu.az' AND p.profile_type = 'teacher'
UNION ALL
SELECT 'lessons_count' as type, COUNT(*)::text as value, NULL::text as title
FROM lessons l
JOIN profiles p ON l.created_by = p.id
WHERE p.email = 'muallim2@bdu.az' AND p.profile_type = 'teacher'
UNION ALL
-- Exam titles
SELECT 'exam' as type, NULL::text as value, e.title
FROM exams e
JOIN profiles p ON e.created_by = p.id
WHERE p.email = 'muallim2@bdu.az' AND p.profile_type = 'teacher'
UNION ALL
-- Lesson titles
SELECT 'lesson' as type, NULL::text as value, l.title
FROM lessons l
JOIN profiles p ON l.created_by = p.id
WHERE p.email = 'muallim2@bdu.az' AND p.profile_type = 'teacher'
ORDER BY type, title NULLS LAST
\`\`\`

**CRITICAL SQL RULES for UNION ALL**:
- All SELECT statements must have the SAME number of columns (3 columns in this example)
- Column types must be compatible - use \`::text\` to convert COUNT(*) to text
- Use \`NULL::text\` (not just \`NULL\`) to ensure type compatibility
- Column names come from the first SELECT statement
- Always specify column types explicitly when mixing COUNT and text columns
- **CRITICAL**: The error "syntax error at or near 'created_by'" usually means:
  - Missing JOIN keyword before ON
  - Incorrect column reference
  - Missing table alias
  - Always use: \`FROM exams e JOIN profiles p ON e.created_by = p.id\` (with table aliases)

### Important Notes:

1. **Users vs Profiles**: There is NO "users" table. Use \`profiles\` table for all user queries.
2. **Teachers vs Students**: Filter by \`profile_type\` column, not separate tables.
3. **RLS**: All queries are automatically filtered by organization_id for school admins.
4. **Relationships**: 
   - profiles.organization_id → organizations.id
   - classes.teacher_id → profiles.id
   - class_enrollments links profiles (students) to classes
   - exams.created_by → profiles.id (teacher)
   - exam_submissions.student_id → profiles.id
   - lesson_progress.student_id → profiles.id, lesson_progress.lesson_id → lessons.id
   - lessons.created_by → profiles.id (teacher)
   - courses.created_by → profiles.id (teacher)
   - courses.lesson_ids → array of lesson UUIDs

`
