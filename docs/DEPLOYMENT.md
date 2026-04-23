# Eduator deployment (Vercel)

*Applies to current release (v0.17.7).*

You have **three deployable parts** in this repo. Deploy each as a **separate Vercel project** from the same GitHub repo so you get:

- **API** – backend (already deployed)
- **ERP app** – main app (teacher/student, login, courses, exams, etc.)
- **ERP app** – org/admin app (platform owner, school admin, teacher API integration)

Because each project gets a **different URL**, you must set **environment variables** and **Supabase redirect URLs** so the apps know each other’s URLs and auth works.

**Build approach (Turborepo):** The repo uses **Turborepo** so only the app you deploy (and its dependencies) are built. Each app’s `vercel.json` uses **installCommand** to run `cd ../.. && npm install` from the repo root, and **buildCommand** to run `cd ../.. && npx turbo run build --filter=<app>` so Turbo builds just that app and its workspace dependencies. **Root Directory** must be `apps/erp-app`, `apps/erp-app`, or `packages/api-server` so Vercel runs from the correct folder.

**Deploy only when an app changed (Ignore Build Step):** To avoid rebuilding all three apps on every push, set **Ignored Build Step** in each Vercel project so that project only builds when *that* app or its dependencies changed:

1. Vercel Dashboard → select the project (ERP, ERP, or API).
2. **Settings** → **General** → **Ignored Build Step**.
3. Set the command to: **`npx turbo-ignore`** (no arguments).

When you push, each project runs `npx turbo-ignore` from its Root Directory. If that workspace (or any dependency) has no changes since the last deployment, the build is **skipped**. Only the app(s) you actually changed will deploy. This keeps deploys fast and avoids building all three apps on every commit.

**Important:** `NEXT_PUBLIC_*` variables are **embedded at build time**. After you add or change env vars in Vercel, you **must Redeploy** the project (Deployments → ⋯ → Redeploy) so the new values are used. Otherwise you may see "Application error", 404, or 405.

**URLs:** Set `NEXT_PUBLIC_ERP_URL` and `NEXT_PUBLIC_ERP_URL` **without** a trailing slash (e.g. `https://edu-space-erp-app.vercel.app`, not `https://edu-space-erp-app.vercel.app/`).

**URL source of truth in app code:**
- ERP cross-app URLs are resolved in `apps/erp-app/src/lib/portal-urls.ts`
- ERP cross-app URLs are resolved in `apps/erp-app/src/lib/portal-urls.ts`
- Shared auth middleware redirect URL is resolved in `packages/auth/src/supabase/middleware.ts`

When changing domain values, update deployment env vars first, then rebuild/redeploy so client bundles pick up new `NEXT_PUBLIC_*` values.

---

## Auto-deploy vs manual deploy (Vercel)

Deployment behavior is controlled **in the Vercel Dashboard**, not in this repo.

- **Default:** With Git connected, Vercel deploys **automatically** when you push to the production branch (e.g. `main`). You do **not** need to do anything in Vercel after a commit — it will deploy.

- **To stop auto-deploy and deploy only when you want (manual):**
  1. [Vercel Dashboard](https://vercel.com/dashboard) → select the project (API, ERP, or ERP).
  2. **Settings** → **Git**.
  3. Under **Production Branch**, either:
     - **Option A:** Set **Ignored Build Step** (Settings → General): use a command that returns exit code 0 only when you want to build (e.g. only when a tag is pushed: `[ "$VERCEL_GIT_COMMIT_REF" = "main" ] && [ -n "$VERCEL_GIT_COMMIT_SHA" ]` or a custom script), or
     - **Option B:** **Disconnect** the Git repository (Settings → Git → Disconnect). Then deploy only via CLI when you want: `cd apps/erp-app && vercel --prod` (and similarly for `apps/erp-app`, `packages/api-server`).

- **To deploy manually without disconnecting Git:** Use **Deployments** → **Create Deployment** (or redeploy an existing one), or from the repo: `vercel --prod` from the app’s directory. You can still push commits without triggering a production deploy if you use **Ignored Build Step** as above.

So: **you do not need to change anything in the repo** to switch to manual deploys — configure it in Vercel. If you leave Git connected and do nothing, every push to the production branch will continue to deploy automatically.

---

## 0. Supabase – Redirect URLs (do this once)

After you have your deployed URLs:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, add:
   - Your **ERP app** URL, e.g. `https://erp-app-xxx.vercel.app`
   - Your **ERP app** URL, e.g. `https://erp-app-xxx.vercel.app`
   - Plus with paths if needed, e.g. `https://erp-app-xxx.vercel.app/**`, `https://erp-app-xxx.vercel.app/**`
3. Save. This allows Supabase to redirect users back to the correct app after login.

---

## 1. API (backend)

- **Root Directory:** `packages/api-server`
- **Build:** From repo root, `npx turbo run build --filter=@eduator/api-server` (see `vercel.json` in this package).
- **Result:** One URL, e.g. `https://edu-space-api-server-xxx.vercel.app`

### 1.1 How to configure the API project in Vercel (manual steps)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and open your **API project** (the one with Root Directory `packages/api-server`).
2. Open **Settings** → **Environment Variables**.
3. Add the variables below. Use **Production** (and optionally Preview) for each.
4. After saving, go to **Deployments** → open the **⋯** menu on the latest deployment → **Redeploy** so the new env vars are used.

### 1.2 API environment variables (exact names)

| Variable | Required | Where to get it | Example / format |
|----------|----------|-----------------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Dashboard → **Project Settings** → **API** → **Project URL** | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase Dashboard → **Project Settings** → **API** → **Project API keys** → **service_role** (secret) | Long string starting with `eyJ...` |
| `CORS_ORIGINS` | Yes (prod) | Your deployed ERP + ERP URLs, comma-separated, no spaces | `https://erp-app-xxx.vercel.app,https://erp-app-xxx.vercel.app` |

- **Supabase:** The API uses these to validate JWT tokens and API keys and to access the database. Same project as your ERP/ERP apps.
- **CORS_ORIGINS:** Without this, browser requests from your deployed ERP and ERP apps will be blocked by CORS. Add both app URLs once you have them.

### 1.3 Optional API env vars

| Variable | Description |
|----------|-------------|
| `API_PORT` | Port when running locally (default `4000`). Ignored on Vercel. |
| `LOG_LEVEL` | Log level, e.g. `info` or `debug`. |

### 1.4 API config checklist

- [ ] Vercel → API project → **Settings** → **Environment Variables**
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` (from Supabase → Project Settings → API → Project URL)
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` (from Supabase → Project Settings → API → service_role key)
- [ ] Add `CORS_ORIGINS` = `https://your-erp-url.vercel.app,https://your-ERP-url.vercel.app` (no spaces)
- [ ] **Deployments** → **⋯** on latest → **Redeploy** so the API uses the new env

---

## 2. ERP app (main app)

1. In [Vercel Dashboard](https://vercel.com/dashboard) → **Add New…** → **Project**.
2. Import the same repo (e.g. `EmilUnP/Eduator`).
3. **Root Directory:** **`apps/erp-app`**. **Include source files outside of the Root Directory:** **Enabled** (default).
4. **Output Directory:** leave **empty**.
5. **Framework Preset:** Next.js (auto-detected).
6. **Environment variables** (Settings → Environment Variables):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | If using API | Deployed API URL (e.g. `https://edu-space-api-server-xxx.vercel.app`) |
| `NEXT_PUBLIC_ERP_URL` | Yes (cross-app) | **Deployed ERP app URL** (e.g. `https://erp-app-xxx.vercel.app`). Used for “Go to ERP Portal” and redirects after auth. |
| `NEXT_PUBLIC_ERP_URL` | Optional | Your own ERP URL (defaults to localhost for local dev). |

7. Deploy.

You’ll get a URL like `https://erp-app-xxx.vercel.app` – that’s your **main app** (login, teacher/student dashboards, etc.).

---

## 3. ERP app (org/admin + teacher API integration)

1. **Add New…** → **Project** again, same repo.
2. **Root Directory:** **`apps/erp-app`** (so the build and runtime stay in this folder; do **not** use `erp-app` alone).
3. **Include source files outside of the Root Directory:** **Enabled** (so the install step can run `cd ../.. && npm install` and build workspace packages; this is usually on by default).
4. **Output Directory:** leave **empty** (do not set to `erp-app` or anything else).
5. **Framework Preset:** Next.js.
6. **Environment variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | Yes | API URL (e.g. `https://edu-space-api-server-xxx.vercel.app`) for Teacher → API Integration and other API calls. |
| `NEXT_PUBLIC_ERP_URL` | Yes (cross-app) | **Deployed ERP app URL** (e.g. `https://erp-app-xxx.vercel.app`). Used for “Go to ERP Portal” and redirects after auth. |
| `NEXT_PUBLIC_ERP_URL` | Optional | Your own ERP URL (defaults to localhost for local dev). |
| `SUPABASE_SERVICE_ROLE_KEY` | If using Platform Owner org actions | From Supabase → Project Settings → API → **service_role** key. Needed for creating school admins, etc. Do **not** add this to the ERP app. |

7. Deploy.

You’ll get a URL like `https://erp-app-xxx.vercel.app` – **ERP / admin app**.

**If you see "Application error", 404, or 405:**  
- Make sure you **Redeployed** the ERP project **after** adding env vars (Deployments → ⋯ → Redeploy). `NEXT_PUBLIC_*` are baked in at build time.  
- Use URLs **without** trailing slash: `https://edu-space-erp-app.vercel.app` (no `/` at the end).

**If you see POST 405 on `/api/auth/login` and Vercel logs show "Cannot find module 'next/dist/compiled/source-map'":**  
The app is running from the wrong directory (e.g. `erp-app` instead of `apps/erp-app`). Fix it in Vercel:

1. Open the **ERP** project → **Settings** → **General**.
2. **Root Directory:** set to exactly **`apps/erp-app`** (include the `apps/` prefix). If it is empty or set to `erp-app`, change it to `apps/erp-app`.
3. **Output Directory:** leave **empty** (do not set to `erp-app` or anything).
4. Save and **Redeploy** the project.

If the build then fails at "Collecting build traces" with `ENOENT ... erp-app/.next`, your Vercel project name or another setting may be forcing that path; keep Root Directory as `apps/erp-app` and Output Directory empty, then redeploy again.

---

## Summary

| What you see        | Vercel project  | Root Directory       | URL example                          |
|---------------------|-----------------|----------------------|--------------------------------------|
| API (JSON, /docs)   | api-server      | `packages/api-server`| `https://edu-space-api-server-…`     |
| Main app (ERP)     | erp-app        | `apps/erp-app`      | `https://erp-app-…`                 |
| ERP / Admin app     | erp-app         | `apps/erp-app`       | `https://erp-app-…`                   |

- **API** = backend only (no UI). Set **`CORS_ORIGINS`** to your ERP and ERP URLs.
- **ERP app** = main product (teachers, students, courses, exams). Set **`NEXT_PUBLIC_ERP_URL`** to your ERP URL.
- **ERP app** = platform/school admin + teacher API integration. Set **`NEXT_PUBLIC_ERP_URL`** to your ERP URL.

**Order to deploy and configure:**  
1) Deploy API → note URL → set `CORS_ORIGINS`.  
2) Deploy ERP → note URL.  
3) Deploy ERP → note URL.  
4) In **ERP** project: set `NEXT_PUBLIC_ERP_URL` to ERP URL.  
5) In **ERP** project: set `NEXT_PUBLIC_ERP_URL` to ERP URL.  
6) In **Supabase**: add both app URLs to Redirect URLs.  
7) Redeploy ERP and ERP (or trigger a redeploy) so they pick up the new env and work together.

For architecture and stack details see [TECHNICAL.md](./TECHNICAL.md).
