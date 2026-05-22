-- =============================================================================
-- Eduator — initial admin user (data only, no schema changes)
-- =============================================================================
--
-- Run AFTER the database schema exists (e.g. 000_full_schema.sql or db:migrate):
--
--   psql "postgres://USER:PASSWORD@HOST:5432/eduator_clean" \
--     -f apps/backend/db/seeds/001_admin_user.sql
--
-- From apps/backend:
--   psql "$DATABASE_URL" -f db/seeds/001_admin_user.sql
--
-- Default login (CHANGE on production — see bottom of file):
--   Email:    admin@clean.local
--   Password: admin12345
--
-- Safe to re-run: skips insert if email already exists.
-- =============================================================================

BEGIN;

SET search_path TO public;

-- Requires pgcrypto (created by 000_full_schema.sql / 001_init.sql)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO users (email, password_hash, role, manual_note)
VALUES (
  'admin@clean.local',
  -- bcrypt cost 12 — same as apps/backend/src/utils/security.ts (bcryptjs)
  '$2b$12$XIpt744uRmH3bX3OYeeFWO8MGBSTHJOeG65Xx2mCRiR76oPkJm5pW',
  'admin',
  'Initial server admin'
)
ON CONFLICT (email) DO NOTHING;

COMMIT;

-- -----------------------------------------------------------------------------
-- Verify (optional — run in psql after the script)
-- -----------------------------------------------------------------------------
-- SELECT id, email, role, created_at FROM users WHERE role = 'admin';

-- -----------------------------------------------------------------------------
-- Change password before production
-- -----------------------------------------------------------------------------
-- Option A — generate a new hash (from apps/backend):
--   node -e "import('bcryptjs').then(({hash})=>hash('YOUR_STRONG_PASSWORD',12).then(console.log))"
-- Then:
--   UPDATE users
--   SET password_hash = '$2b$12$...your_new_hash...', updated_at = NOW()
--   WHERE email = 'admin@clean.local';
--
-- Option B — use pgcrypto in SQL (password visible in shell history; use with care):
--   UPDATE users
--   SET password_hash = crypt('YOUR_STRONG_PASSWORD', gen_salt('bf', 12)),
--       updated_at = NOW()
--   WHERE email = 'admin@clean.local';
--
-- Option C — npm seed (same default password as this file):
--   cd apps/backend && npm run db:seed
--   (uses admin@clean.local — different email; pick one approach)
