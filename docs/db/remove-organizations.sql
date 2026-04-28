-- Global scope migration: remove organization system.
-- Run this in Supabase SQL editor after deploying code that no longer relies on organization_id.

begin;

-- 1) Drop foreign keys referencing organizations.
alter table if exists profiles drop constraint if exists profiles_organization_id_fkey;
alter table if exists classes drop constraint if exists classes_organization_id_fkey;
alter table if exists exams drop constraint if exists exams_organization_id_fkey;
alter table if exists lessons drop constraint if exists lessons_organization_id_fkey;
alter table if exists documents drop constraint if exists documents_organization_id_fkey;
alter table if exists courses drop constraint if exists courses_organization_id_fkey;

-- 2) Drop organization_id columns (after constraints are removed).
alter table if exists profiles drop column if exists organization_id;
alter table if exists classes drop column if exists organization_id;
alter table if exists exams drop column if exists organization_id;
alter table if exists lessons drop column if exists organization_id;
alter table if exists documents drop column if exists organization_id;
alter table if exists courses drop column if exists organization_id;

-- 3) Drop organizations table.
drop table if exists organizations cascade;

commit;
