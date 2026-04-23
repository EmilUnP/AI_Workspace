# Eduator AI – Documentation Index

This index lists **where** key information lives and **what to update** when you ship a release, so manager reports and product summaries don’t depend on manual hunting.

---

## 1. Core docs (single source of truth)

| Document | Purpose | Audience |
|----------|---------|----------|
| **CHANGELOG.md** (repo root) | **Authoritative** list of every release and what changed. Newest first. Use **Added / Changed / Fixed** and concrete details (pages, APIs, DB). | Devs, support, and **anyone writing manager reports** – start here. |
| **FEATURES.md** | **User-facing** feature list by version. One place to see “what can users do in 0.14.0?” No duplication: each feature under the version it was introduced. | Product, support, sales. |
| **ROADMAP.md** | **Completed** versions (short bullets) and **planned** work (future versions). Keep “Current Release” and completed list in sync with CHANGELOG. | Product, leadership. |
| **API.md** | Public/customer-facing API: endpoints, auth, token system, 402, examples. | Integrators, devs. |
| **docs/technical/INTEGRATION_GUIDE.md** | Step-by-step integration (auth, token balance, 402 handling). | Integrators. |
| **docs/APP_MAIN_PARTS.md** | Simple management overview of key product modules, role boundaries, and main workflows. | Product, management, stakeholders. |

---

## 1.1 Consolidation Rules (to reduce repetition)

- Keep **release facts** in `CHANGELOG.md` first.
- Keep **user-visible capability summary** in `FEATURES.md`.
- Keep **technical reasoning and architecture tradeoffs** in `TECHNICAL_HIGHLIGHTS.md`.
- Keep **manager narrative** in monthly manager report files only.
- When content is repeated in multiple files, keep the most complete version in one file and replace the others with short pointers.

## 2. When you release – checklist

**Every release**, update in this order so nothing is missed:

1. **CHANGELOG.md**
   - Add new `## [X.Y.Z] - YYYY-MM-DD` at the top.
   - Use sections: `### ✨ Added`, `### 🔧 Changed`, `### 🐛 Fixed`, `### 📚 Documentation & technical`.
   - Write **concrete** entries (route paths, setting names, DB/API changes). Avoid vague “improved X”; say *what* was improved so manager reports can cite it.

2. **FEATURES.md**
   - Bump “Current Release” to the new version.
   - Add a **“Added in X.Y.Z”** block with **user-facing** bullets (no internal implementation detail).
   - Ensure no version is skipped (e.g. if you have 0.14.0 and 0.11.0, add 0.12.0 and 0.11.2).

3. **ROADMAP.md**
   - Under **✅ Completed Versions**, add the new version with 2–5 short bullets.
   - Set **“Current Release”** to the new version in the intro or note.
   - If the release was a patch (e.g. 0.11.2), add it to the completed list so the sequence is clear.

4. **API.md** (if API or token behavior changed)
   - New endpoints, 402 behavior, token balance, dashboard fields.

5. **docs/technical/INTEGRATION_GUIDE.md** (if integration steps changed)
   - Token balance check, 402 handling, new env or config.

6. **Token docs** (if token system changed)
   - `TOKEN_AND_PAYMENTS_PLAN.md` and token sections in `API.md` / `INTEGRATION_GUIDE.md`.

7. **Root package.json**
   - Bump `version` to the new release.

---

## 3. Where to document what

| Type of change | Primary place | Also update |
|----------------|---------------|-------------|
| New user-facing feature | CHANGELOG (Added) + FEATURES (new version block) | ROADMAP completed |
| Bug fix / reliability | CHANGELOG (Fixed or Changed) | FEATURES only if it changes “what users can do” |
| API / integration | CHANGELOG + API.md | INTEGRATION_GUIDE.md if steps change |
| Token system | CHANGELOG + TOKEN_AND_PAYMENTS_PLAN.md | API.md, FEATURES |
| UI/UX (e.g. document page, public pages, math, tables) | **CHANGELOG** with a clear line (e.g. “Document management page fully updated”, “Math symbols in lesson and chat”, “Tables and figures in lessons”) | FEATURES if it’s a visible capability |
| Internal refactor / tech only | CHANGELOG (Changed) | — |
| Manager / stakeholder report | Use CHANGELOG + FEATURES + ROADMAP; no separate “source” needed if these are complete | — |

**Important:** If it’s visible to users or to managers (e.g. “Find Teachers”, “public page redesign”, “document management”, “math in lessons”), it should have at least one **explicit** line in CHANGELOG so reports don’t depend on manual recall.

---

## 4. Other docs (reference)

| Document | Purpose |
|----------|---------|
| **MANAGER_REPORTS.md** | Single index for all manager reports and reporting workflow. |
| **docs/MANAGER_REPORT_2026-04_FEATURE_VISIBILITY.md** | Manager-friendly rollout summary for feature visibility, class onboarding improvements, platform-owner AI cost intelligence, and teacher reporting/class intelligence upgrades. |
| **docs/technical/LESSON_VIEW_RENDERING_GUIDE.md** | Lesson rendering architecture, markdown/math/diagram behavior, and integration contract. |
| **docs/technical/MODEL_USAGE_COST_ANALYTICS.md** | How real-token-usage computes model-level token analytics and estimated USD cost, including assumptions and maintenance workflow. |
| **docs/technical/COURSE_RATINGS_ENROLLMENTS_VIEWS.md** | Course ratings, enrollments, and view-count system details. |
| **TECHNICAL.md** | Reference architecture and implementation details. |
| **TECHNICAL_HIGHLIGHTS.md** | Preferred executive technical summary (architecture/security/integration/reporting highlights). |
| **DEPLOYMENT.md** | Deploy and env. |
| **Platform Owner: Feature visibility** | ERP page `/platform-owner/feature-visibility` for global teacher/student page visibility controls across ERP/ERP. |
| **STABILITY_IMPROVEMENTS.md** | Stability and reliability notes. |
| **docs/technical/** | Migrations, auth examples, logging, integration guides. |
| **docs/agent/** | AI agent: modes, API, quick start, possible questions. |
| **TOKEN_AND_PAYMENTS_PLAN.md** | Token/payment roadmap and planning notes. |
| **ROLES_AND_SPEED_ANALYSIS.md** | Hardcoded profiles vs admin-defined roles; impact on app speed. |
| **PERFORMANCE_IMPROVEMENTS_ANALYSIS.md** | Full codebase performance improvements (DB, auth, cache, API, Next.js, client) without losing security or quality. |

---

## 5. Quick health check

- **CHANGELOG**: Latest release at top; every release has Added/Changed/Fixed as applicable; entries are specific (not “various improvements”).
- **FEATURES**: “Current Release” matches package.json; no skipped versions between oldest and newest “Added in X.Y.Z”.
- **ROADMAP**: “Completed Versions” includes every released version (including patches); “Current Release” is correct.
- **API.md**: Token balance, 402, and new endpoints are documented when relevant.

If all four are consistent, manager reports and product summaries can be written from these docs without manual digging.
