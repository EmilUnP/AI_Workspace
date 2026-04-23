# Possible Questions - AI Agent Query Reference

This document lists all possible question types and query patterns that the AI Agent can handle. This is a living document that should be updated whenever new query patterns are added. The agent uses **agentic improvements** (reflection/retry, critic step, schema-awareness, "think first" understanding) so semantically equivalent phrasings are handled consistently and SQL errors are self-corrected. See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

**Last Updated**: February 2026 (v0.9.0)

---

## Table of Contents

1. [User/Profile Queries](#userprofile-queries)
2. [Organization-Specific Queries](#organization-specific-queries)
3. [Class Queries](#class-queries)
4. [Exam Queries](#exam-queries)
5. [Lesson Queries](#lesson-queries)
6. [Document Queries](#document-queries)
7. [Combined/Multi-Entity Queries](#combinedmulti-entity-queries)
8. [Count/Statistics Queries](#countstatistics-queries)

---

## User/Profile Queries

### Basic User Queries

**Show all users**
- "Show all users"
- "List all users"
- "Get all users"
- "Display users"

**Show all teachers**
- "Show all teachers"
- "List all teachers"
- "Get all teachers"
- "Display teachers"

**Show all students**
- "Show all students"
- "List all students"
- "Get all students"
- "Display students"

**Show all school admins**
- "Show all school admins"
- "List all school admins"
- "Get all school admins"

**Show all platform owners**
- "Show all platform owners"
- "List all platform owners"

### Count Queries

**Count all users**
- "How many users are there?"
- "Count all users"
- "Total number of users"
- "User count"

**Count teachers**
- "How many teachers are there?"
- "Count teachers"
- "Total number of teachers"
- "Teacher count"
- "How many teachers?"

**Count students**
- "How many students are there?"
- "Count students"
- "Total number of students"
- "Student count"
- "How many students?"

**Count school admins**
- "How many school admins are there?"
- "Count school admins"
- "School admin count"

### Users Without Organization (ERP Users)

**Show users without organization**
- "Show users with no organization"
- "Users without organization"
- "Users with null organization"
- "Show ERP users"
- "List users not assigned to any organization"

**Count users without organization**
- "How many users have no organization?"
- "Count users without organization"
- "How many ERP users are there?"

---

## Organization-Specific Queries

### Users in Organization

**Show users in organization**
- "Show users in Test organization"
- "Users in Test organization"
- "List users in Test organization"
- "Get users from Test organization"
- "Show all users in Test"

**Count users in organization**
- "How many users in Test organization?"
- "Count users in Test organization"
- "Total users in Test organization"
- "Test organization neçə istifadəçi var?" (Azerbaijani)

### Teachers in Organization

**Show teachers in organization**
- "Show teachers in Test organization"
- "Teachers in Test organization"
- "List teachers in Test organization"
- "Get teachers from Test organization"
- "Show all teachers in Test"

**Count teachers in organization**
- "How many teachers in Test organization?"
- "Count teachers in Test organization"
- "Teacher count in Test organization"
- "Test organization neçə müəllim var?" (Azerbaijani)

### Students in Organization

**Show students in organization**
- "Show students in Test organization"
- "Students in Test organization"
- "List students in Test organization"
- "Get students from Test organization"
- "Show all students in Test"

**Count students in organization**
- "How many students in Test organization?"
- "Count students in Test organization"
- "Student count in Test organization"
- "Test organization neçə tələbə var?" (Azerbaijani)

### Combined: Teachers and Students in Organization

**Show teachers and students**
- "Show teachers and students in Test organization"
- "Teachers and students in Test organization"
- "Show all teachers and students in Test"

**Count teachers and students**
- "How many teachers and students in Test organization?"
- "Test organization neçə müəllim və tələbə var?" (Azerbaijani)

---

## Class Queries

### Basic Class Queries

**Show all classes**
- "Show all classes"
- "List all classes"
- "Get all classes"
- "Display classes"

**Count all classes**
- "How many classes are there?"
- "Count all classes"
- "Total number of classes"

### Classes in Organization

**Show classes in organization**
- "Show classes in Test organization"
- "Classes in Test organization"
- "List classes in Test organization"
- "Get classes from Test organization"
- "Show all classes in Test"

**Count classes in organization**
- "How many classes in Test organization?"
- "Count classes in Test organization"
- "Total classes in Test organization"

### Specific Class Queries

**Show specific class**
- "Show class Math 101"
- "Get class Math 101"
- "Display class Math 101"
- "Show class with name Math 101"

**Class information**
- "Class info for Math 101"
- "Information about Math 101 class"
- "Details of Math 101 class"
- "Show class details for Math 101"

**Class with teacher and organization**
- "Show class Math 101 with teacher and organization"
- "Class info for Math 101 including teacher"
- "Show Math 101 class details"

### Students in Class

**Show students in class**
- "Show students in class Math 101"
- "Students in Math 101"
- "List students in Math 101 class"
- "Get students enrolled in Math 101"
- "Who is in class Math 101"
- "Show who has Math 101 class"

**Count students in class**
- "How many students in Math 101?"
- "Count students in Math 101 class"
- "Total students in Math 101"
- "Student count in Math 101"

**Students enrolled in class**
- "Show enrolled students in Math 101"
- "Active students in Math 101"
- "List active enrollments in Math 101"

### Class by Teacher

**Classes taught by teacher**
- "Show classes taught by John Doe"
- "Classes by teacher John Doe"
- "List classes for teacher John Doe"
- "Show classes where teacher is John Doe"

**Classes by teacher ID**
- "Show classes taught by teacher with id abc-123"
- "Classes by teacher id abc-123"

---

## Exam Queries

### Basic Exam Queries

**Show all exams**
- "Show all exams"
- "List all exams"
- "Get all exams"
- "Display exams"
- "Show saved exams"

**Count all exams**
- "How many exams are there?"
- "Count all exams"
- "Total number of exams"

### Exams in Organization

**Show exams in organization**
- "Show exams in Test organization"
- "Exams in Test organization"
- "List exams in Test organization"
- "Get exams from Test organization"
- "Show all exams in Test"

**Count exams in organization**
- "How many exams in Test organization?"
- "Count exams in Test organization"
- "Total exams in Test organization"

### Exams by Teacher

**Show exams created by teacher (by name)**
- "Show exams created by teacher John Doe"
- "Exams by teacher John Doe"
- "List exams created by John Doe"
- "Show exams from teacher John Doe"
- "Exams created by teacher named John Doe"

**Show exams created by teacher (by ID)**
- "Show exams created by teacher with id abc-123"
- "Exams by teacher id abc-123"
- "List exams from teacher abc-123"
- "Show exams created by teacher abc-123"

**Count exams by teacher**
- "How many exams created by John Doe?"
- "Count exams by teacher John Doe"
- "Total exams by John Doe"

### Exams for Class

**Show exams for class**
- "Show exams for class Math 101"
- "Exams in Math 101 class"
- "List exams assigned to Math 101"
- "Get exams for Math 101"
- "Show exams for class Math 101"

**Count exams for class**
- "How many exams in Math 101?"
- "Count exams for Math 101 class"
- "Total exams in Math 101"

### Combined: Exams by Teacher in Organization

**Show exams by teacher in organization**
- "Show exams created by John Doe in Test organization"
- "Exams by teacher John Doe in Test organization"
- "List exams from John Doe in Test"

---

## Lesson Queries

### Basic Lesson Queries

**Show all lessons**
- "Show all lessons"
- "List all lessons"
- "Get all lessons"
- "Display lessons"
- "Show saved lessons"

**Count all lessons**
- "How many lessons are there?"
- "Count all lessons"
- "Total number of lessons"

### Lessons in Organization

**Show lessons in organization**
- "Show lessons in Test organization"
- "Lessons in Test organization"
- "List lessons in Test organization"
- "Get lessons from Test organization"
- "Show all lessons in Test"

**Count lessons in organization**
- "How many lessons in Test organization?"
- "Count lessons in Test organization"
- "Total lessons in Test organization"

### Lessons by Teacher

**Show lessons created by teacher (by name)**
- "Show lessons created by teacher John Doe"
- "Lessons by teacher John Doe"
- "List lessons created by John Doe"
- "Show lessons from teacher John Doe"
- "Lessons created by teacher named John Doe"

**Show lessons created by teacher (by ID)**
- "Show lessons created by teacher with id abc-123"
- "Lessons by teacher id abc-123"
- "List lessons from teacher abc-123"
- "Show lessons created by teacher abc-123"

**Count lessons by teacher**
- "How many lessons created by John Doe?"
- "Count lessons by teacher John Doe"
- "Total lessons by John Doe"

### Lessons for Class

**Show lessons for class**
- "Show lessons for class Math 101"
- "Lessons in Math 101 class"
- "List lessons assigned to Math 101"
- "Get lessons for Math 101"
- "Show lessons for class Math 101"

**Count lessons for class**
- "How many lessons in Math 101?"
- "Count lessons for Math 101 class"
- "Total lessons in Math 101"

### Combined: Lessons by Teacher in Organization

**Show lessons by teacher in organization**
- "Show lessons created by John Doe in Test organization"
- "Lessons by teacher John Doe in Test organization"
- "List lessons from John Doe in Test"

---

## Document Queries

### Basic Document Queries

**Show all documents**
- "Show all documents"
- "List all documents"
- "Get all documents"
- "Display documents"

**Count all documents**
- "How many documents are there?"
- "Count all documents"
- "Total number of documents"

### Documents in Organization

**Show documents in organization**
- "Show documents in Test organization"
- "Documents in Test organization"
- "List documents in Test organization"

**Count documents in organization**
- "How many documents in Test organization?"
- "Count documents in Test organization"

### Documents by Creator

**Show documents created by user**
- "Show documents created by John Doe"
- "Documents by John Doe"
- "List documents from John Doe"

---

## Combined/Multi-Entity Queries

### Teachers and Students Together

**Show teachers and students**
- "Show teachers and students"
- "List teachers and students"
- "Show all teachers and students"

**Show teachers and students in organization**
- "Show teachers and students in Test organization"
- "Teachers and students in Test organization"

**Count teachers and students**
- "How many teachers and students?"
- "Count teachers and students"
- "How many teachers and students in Test organization?"

### Users by Profile Type

**Show users by type**
- "Show all teachers and students"
- "Show teachers, students, and admins"
- "List all user types"

---

## Count/Statistics Queries

### General Counts

**Count queries**
- "How many users are there?"
- "How many teachers?"
- "How many students?"
- "How many classes?"
- "How many exams?"
- "How many lessons?"

### Organization-Specific Counts

**Counts in organization**
- "How many users in Test organization?"
- "How many teachers in Test organization?"
- "How many students in Test organization?"
- "How many classes in Test organization?"
- "How many exams in Test organization?"
- "How many lessons in Test organization?"

### Class-Specific Counts

**Counts for class**
- "How many students in Math 101?"
- "How many exams in Math 101?"
- "How many lessons in Math 101?"

### Teacher-Specific Counts

**Counts by teacher**
- "How many exams created by John Doe?"
- "How many lessons created by John Doe?"
- "How many classes taught by John Doe?"

---

## Language Support

The AI Agent supports queries in multiple languages. Examples above are primarily in English, but the same patterns work in:

- **English**: "How many teachers in Test organization?"
- **Azerbaijani**: "Test organization neçə müəllim var?"
- **Other languages**: The agent detects the query language and responds in the same language

---

## Query Pattern Notes

### Important Patterns

1. **Organization Name Extraction**: When user says "X organization", extract just "X"
   - ✅ "Test organization" → use `'Test'`
   - ❌ "Test organization" → NOT `'Test organization'`

2. **Table Names**: Always use `profiles` table, never `users`, `teachers`, or `students`
   - ✅ `SELECT * FROM profiles WHERE profile_type = 'teacher'`
   - ❌ `SELECT * FROM teachers`

3. **Column Names**: Use `profile_type`, never `role`
   - ✅ `WHERE profile_type = 'teacher'`
   - ❌ `WHERE role = 'teacher'`

4. **JOINs Required**: For organization name queries, always JOIN with `organizations` table
   - ✅ `SELECT p.* FROM profiles p JOIN organizations o ON p.organization_id = o.id WHERE o.name = 'Test'`
   - ❌ `SELECT * FROM profiles WHERE organization_name = 'Test'`

5. **Null Organization**: Users without organization have `organization_id IS NULL`
   - ✅ `SELECT * FROM profiles WHERE organization_id IS NULL`

---

## Adding New Query Patterns

When adding new query patterns:

1. Add examples to this document in the appropriate section
2. Add examples to `packages/agent/src/prompts/system.ts` in the `SQL_GENERATION_PROMPT`
3. Update normalization logic in `packages/agent/src/executor/sql.ts` if needed
4. Update this document's "Last Updated" date

---

## Testing Query Patterns

To test if a query pattern works:

1. Try the query in the AI Agent widget
2. Check console logs for normalization and execution
3. Verify the SQL generated is correct
4. Verify the results match expectations
5. Add the working pattern to this document

---

**Note**: This document is automatically maintained. When new query patterns are discovered or added, they should be documented here for reference.
