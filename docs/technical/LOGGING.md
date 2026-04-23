# Centralized Logging for Eduator Monorepo

As platform owner you need one place to investigate issues across **backend (api-server)**, **ERP app**, and **ERP app**. Today logs are in Vercel, Supabase, and console only.

## Options

| Approach | Pros | Cons |
|----------|------|------|
| **Database table** | Queryable, one place, no extra vendor | Volume/retention limits; cost at scale; DB can become bottleneck |
| **File-based** | Simple, no DB load | Hard to query; not ideal for serverless (Vercel); many files to manage |
| **Cloud (Datadog, Logtail, Sentry, GCP)** | Querying, alerts, retention, scaling | Cost, external dependency, setup |
| **Shared package + optional DB/HTTP** | Consistent format; can start with console, add DB or cloud later | Requires discipline to use the logger everywhere |

## Recommendation

1. **Short term**
   - Add a shared **`@eduator/logger`** package in the monorepo used by:
     - `apps/erp-app` (server actions, API routes)
     - `apps/erp-app` (server actions, API routes)
     - `packages/api-server`
   - Logger behavior:
     - **Dev:** log to console with level, message, and optional meta (JSON).
     - **Production:** same format; optionally send to a **DB transport** (batch insert into `app_logs`) or an HTTP endpoint (e.g. Logtail webhook).
   - Add an **`app_logs`** table and a minimal **Logs** page (e.g. under platform-owner or a simple backend UI) to filter by level, service, time range, and search message/meta.

2. **Long term**
   - If volume grows or you need alerts/dashboards, add a **cloud log sink** (e.g. Logtail/Datadog) and keep `@eduator/logger` as the single interface; add a transport that POSTs to the provider’s API.

## Suggested `app_logs` schema

```sql
CREATE TABLE IF NOT EXISTS app_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  level      text NOT NULL,        -- 'info' | 'warn' | 'error' | 'debug'
  service    text NOT NULL,        -- 'erp-app' | 'erp-app' | 'api-server'
  message    text NOT NULL,
  meta       jsonb,                -- optional context (user_id, request_id, document_id, etc.)
  env        text                  -- 'development' | 'preview' | 'production'
);

CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_service ON app_logs(service);
```

- **Retention:** e.g. delete rows older than 30 days via a cron or Supabase Edge Function to avoid unbounded growth.

## Logger API (sketch)

```ts
// packages/logger/src/index.ts
export function createLogger(service: string) {
  return {
    info(message: string, meta?: Record<string, unknown>) {
      log('info', service, message, meta)
    },
    warn(message: string, meta?: Record<string, unknown>) {
      log('warn', service, message, meta)
    },
    error(message: string, meta?: Record<string, unknown>) {
      log('error', service, message, meta)
    },
    debug(message: string, meta?: Record<string, unknown>) {
      if (process.env.NODE_ENV === 'development') log('debug', service, message, meta)
    },
  }
}
function log(level: string, service: string, message: string, meta?: Record<string, unknown>) {
  const payload = { level, service, message, meta, env: process.env.VERCEL_ENV ?? process.env.NODE_ENV }
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(payload))
  // Optional: buffer and batch-insert to app_logs or POST to external endpoint
}
```

## Next steps

1. Create `packages/logger` with `createLogger` and console output.
2. Add `app_logs` migration (see schema above) and optional DB transport with batching.
3. Replace critical `console.error`/`console.log` in server actions and API routes with the logger (start with upload and document processing).
4. Add a simple Logs page (platform-owner or backend) to query `app_logs` with filters and pagination.

This gives you a single, consistent way to capture and investigate logs across the monorepo without locking you into a single storage backend.
