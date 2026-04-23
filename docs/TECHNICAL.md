# Technical Overview

## Monorepo Structure

- `apps/erp-app` - main Next.js product UI
- `apps/marketing-site` - minimal public site
- `packages/api-server` - Fastify API
- `packages/*` - shared auth, db, core, ui, ai, config modules

## Auth and Routing

- Supabase auth/session
- Role-based route protection in middleware
- Student route access blocked at login/callback/middleware levels

## Data

- Supabase/Postgres repositories in `packages/db`
- Student data retained for management/reporting flows

## Internationalization

- Active interface locales: `en`, `az`
- Russian and Turkish UI locales removed
