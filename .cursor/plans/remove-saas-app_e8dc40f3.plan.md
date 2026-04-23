---
name: remove-saas-app
overview: Fully remove the SaaS app and all SaaS-specific logic, scripts, docs, and references from the monorepo, leaving ERP as the single web app. Hard-drop all `saas` source branches and purge historical mentions.
todos:
  - id: remove-app-root-scripts
    content: Delete SaaS app and remove root npm script/workspace references
    status: completed
  - id: remove-runtime-deploy
    content: Clean PM2, run scripts, Vercel ignore/config SaaS references
    status: completed
  - id: hard-drop-shared-logic
    content: Remove SaaS source branches from shared auth/core types and visibility logic
    status: completed
  - id: clean-erp-routing
    content: Remove SaaS redirect/portal logic from ERP auth, middleware, and role pages
    status: completed
  - id: purge-docs-history
    content: Purge SaaS mentions from docs and changelog
    status: completed
  - id: verify-erp-only
    content: Run lint/typecheck/build and final repo-wide SaaS reference scan
    status: completed
isProject: false
---

# Full SaaS Removal Plan

## Goal
Remove `apps/saas-app` entirely and eliminate all SaaS-specific behavior/mentions across code, config, scripts, and documentation while keeping ERP functional.

## Scope And Removal Rules
- Delete the SaaS app directory and SaaS-only deployment config.
- Remove all SaaS npm scripts and runtime process entries.
- Hard-drop `saas` source branches from shared auth/core logic and route gating.
- Purge SaaS mentions from active docs and historical docs/changelog.
- Regenerate lockfile and verify repo builds/lints without SaaS.

## Execution Phases

### 1) Remove app and root wiring
- Delete `apps/saas-app` completely.
- Update root `package.json`:
  - remove `dev:saas`, `build:saas`, `debug:vercel:saas`
  - update combined scripts (`build:apps`) to ERP-only.
- Refresh `package-lock.json` after workspace/package removal.

### 2) Remove runtime/deployment references
- Update `ecosystem.config.js`:
  - remove PM2 process for SaaS.
  - remove SaaS URL env wiring (`NEXT_PUBLIC_SAAS_URL`) and any dual-app assumptions.
- Update `run-all.bat` to launch ERP/API/marketing only (no SaaS window/port).
- Remove SaaS Vercel config by deleting `apps/saas-app/vercel.json` (implicitly removed with app folder).
- Clean `.vercelignore` comments/references that mention SaaS outputs.

### 3) Hard-drop SaaS behavior from shared packages
- Update `packages/core/src/types/profile.ts` and `packages/core/src/types/profile.d.ts`:
  - remove `'saas'` from `source` unions.
- Update `packages/core/src/utils/feature-visibility.ts`:
  - remove `FeatureAppSource = 'saas'` branches and SaaS route matrices.
  - simplify all role route maps to ERP-only behavior.
- Update `packages/auth/src/supabase/middleware.ts`:
  - remove SaaS source redirect branches and cross-portal fallback logic.

### 4) Remove SaaS-specific routing helpers and guards
- Delete SaaS helper files (removed with app folder), and clean cross-portal assumptions from remaining apps:
  - `apps/erp-app/src/lib/portal-urls.ts`
  - `apps/marketing-site/src/lib/portal-urls.ts`
- Update ERP auth and role-gate routes that currently branch on SaaS source:
  - `apps/erp-app/src/middleware.ts`
  - `apps/erp-app/src/app/auth/callback/route.ts`
  - `apps/erp-app/src/app/api/auth/login/route.ts`
  - `apps/erp-app/src/app/(auth)/auth/login/action/route.ts`
  - `apps/erp-app/src/app/(auth)/auth/login/actions.ts`
  - `apps/erp-app/src/app/(auth)/auth/signup/page.tsx`
  - `apps/erp-app/src/app/(auth)/auth/forgot-password/page.tsx`
  - `apps/erp-app/src/app/(auth)/auth/login/login-form.tsx`
  - ERP student/teacher pages/layouts that redirect SaaS users to SaaS.

### 5) Purge SaaS mentions from docs/history
- Rewrite/remove SaaS sections in:
  - `README.md`, `docs/DEPLOYMENT.md`, `docs/API.md`, `docs/FEATURES.md`, `docs/ROADMAP.md`, `docs/TECHNICAL.md`, `docs/TECHNICAL_HIGHLIGHTS.md`, `docs/DOCUMENTATION_INDEX.md`, and all `docs/technical/*` files that mention SaaS paths/flows.
- Purge historical mentions from `CHANGELOG.md` (as requested).

### 6) Tooling cleanup and verification
- Update `eslint.config.js` to remove `apps/saas-app` globs/roots.
- Review `.gitignore` stale SaaS paths.
- Run verification:
  - install/update lockfile
  - lint/typecheck/build for ERP + shared packages
  - smoke-check ERP auth/login redirects and key teacher/student routes.

## Acceptance Criteria
- No `apps/saas-app` directory remains.
- `rg "saas-app|\bsaas\b"` returns zero product references (only unavoidable external/vendor text if any).
- ERP app runs/builds successfully with no SaaS runtime dependencies.
- Shared source/type logic has no SaaS branches.
- Docs/changelog contain no SaaS references.
