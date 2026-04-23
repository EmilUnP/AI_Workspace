# RLS Linter Fixes (Supabase Database Linter)

This doc summarizes the Supabase database linter findings and how they are addressed.

## 1. Auth RLS Initialization Plan (`auth_rls_initplan`)

**Issue:** Policies that use `auth.uid()`, `auth.jwt()`, `auth.role()`, or `current_setting()` directly are re-evaluated for **each row**, which hurts performance at scale.

**Fix:** Wrap these calls in a subquery so Postgres evaluates them once per statement (initplan):

- `auth.uid()` → `(select auth.uid())`
- `auth.jwt()` → `(select auth.jwt())`
- `auth.role()` → `(select auth.role())`
- `current_setting(...)` → `(select current_setting(...))`

**Applied by:** Run the migration once in Supabase SQL Editor (or via CLI):

- **File:** `supabase/migrations/20260225000000_fix_rls_auth_initplan.sql`
- **Dashboard:** Supabase → SQL Editor → paste and run the migration contents.
- **CLI:** From project root, `npx supabase db push` (if using Supabase CLI and linked project).

The migration finds all `public` schema policies that still use unwrapped auth/current_setting calls and recreates them with the wrapped form. It is idempotent (safe to run multiple times).

**Reference:** [Supabase RLS – Call functions with select](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)

---

## 2. Multiple Permissive Policies (`multiple_permissive_policies`)

**Issue:** Some tables have multiple **permissive** RLS policies for the same role and action (e.g. SELECT). Postgres then evaluates **each** policy for every row, which is less efficient than a single policy.

**Fix (recommended):** Merge the multiple permissive policies into one policy per (table, role, action) by combining their conditions with `OR`. Example:

- Before: Policy A `USING (condition_a)`, Policy B `USING (condition_b)` for the same role/action.
- After: One policy `USING (condition_a OR condition_b)`.

This is done per table and may require careful testing so behavior (and security) stays the same.

**Status:** Not automated. Tables reported by the linter (e.g. `class_enrollments`, `class_teachers`, `classes`, `documents`, `education_plans`, `exam_submissions`, `exams`, `final_exams`, `lessons`, `organizations`, `profiles`, `teacher_chat_conversations`, `teacher_chat_messages`, `contact_requests`, `token_usage_settings`) can be consolidated in follow-up migrations by:

1. Inspecting current policies (e.g. `SELECT * FROM pg_policies WHERE tablename = '...'`).
2. Writing one new policy per (role, command) that ORs the existing expressions.
3. Dropping the old policies and creating the new merged one(s).

**Reference:** [Supabase Database Linter – multiple permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)
