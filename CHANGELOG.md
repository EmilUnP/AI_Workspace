# Changelog

## 0.0.9 - 2026-04-30

### Changed

- Completed cleanup pass for legacy auth and user-management surfaces in `apps/web-app`.
- Removed pending-approval UI flow usage and legacy approval-focused platform-owner dashboard actions.
- Removed avatar-related fields/rendering across platform-owner and school-admin user UIs.
- Updated login redirect behavior: `admin` users now land on `/platform-owner` after login.
- Simplified platform-owner users page by removing filter UI and adding a simple "Add Operator" flow (email + password, fixed role `operator`).
- Removed mobile sidebar bottom user summary section for cleaner mobile navigation.

### Backend Integration Notes

- Web operator creation now uses `POST /v1/auth/register` with payload role fixed to `operator`.
- No new backend endpoints were required for this step; existing auth routes are reused.

### Notes

- This continues the Supabase-to-local-PostgreSQL cleanup and role-flow simplification.
- Remaining legacy concepts should be removed incrementally in subsequent cleanup passes.

## 0.0.8 - 2026-04-23

### Changed

- Continued hard cleanup of legacy ERP surfaces.
- Removed remaining school-admin class-management UI/routes.
- Removed teacher classes API route and related navigation links.
- Restricted school-admin user management to teacher-only scope.
- Updated docs baseline to match current product state.

### Notes

- This release is the current clean baseline after deep cleanup passes.
- Legacy class, calendar, and student-facing features are intentionally removed from active app surfaces.

## 0.0.5-reset - 2026-04-23

### Changed

- Documentation reset to a lightweight baseline.
- Product scope documented as ERP-first.
- SaaS references removed from active docs.
- Student portal removal documented in current-state docs.

### Notes

- This release acts as a new documentation starting point.
- Older narrative/history is intentionally dropped from docs.
