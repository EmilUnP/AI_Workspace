# Token-Based AI Usage & Payments – Implementation Plan

## Summary

- **Current**: Plan-based limits (Free / Pro / Institution) and per-org `ai_requests_per_month` (ERP). No token balance or per-action costs.
- **Target**: Token-based system where users (teachers/students) **buy tokens** and each AI action consumes a **configurable number of tokens**. Platform owner controls token costs and sees payments/usage. Teachers and students see their token balance in the app. ERP pricing page updated for token purchasing.

---

## 1. Scope

### 1.1 Who has tokens?

- **ERP**: Token balance per **user** (profile) — teachers and students each have their own balance. (Optional later: per-organization pool.)
- **ERP**: Can reuse same data model; balance can be per profile and/or derived from organization subscription + token packs.

### 1.2 AI usage points to charge (token deduction)

| Feature | Where it runs | Charge unit (example) |
|--------|----------------|------------------------|
| **Exam / question generation** | API + ERP (teacher) | Per N questions = 1 token (e.g. 10 questions = 1 token) |
| **Lesson generation** | API + ERP (teacher) | 1 lesson = 1 token (base) |
| **Lesson images** | Inside lesson or course gen | Per image or per batch (e.g. 3 images = 5 tokens) |
| **Lesson TTS (audio)** | Lesson gen, regenerate audio | Per lesson audio = 3 tokens |
| **Course generation** | ERP (teacher) | Per course (structure + N lessons + exam + images + audio) — can be formula: base + per-lesson + per-image + per-audio |
| **Student AI tutor (chat)** | ERP (student) | Per message or per conversation (e.g. 1 token per message) |
| **Teacher AI chat** | ERP (teacher) | Per message (e.g. 1 token per message) |

All numeric costs (e.g. “10 questions = 1 token”, “3 images = 5 tokens”) are **configurable** by platform owner.

### 1.3 Platform owner (admin) capabilities

- **Payments & billing**
  - List payments: who paid, amount, when, for what (e.g. token pack, subscription).
  - Optional: link to invoices or payment provider (Stripe etc.) later.
- **Token usage settings**
  - Single place to set “token cost” for each action type, e.g.:
    - Exam: “1 token per N questions” (e.g. N = 10).
    - Lesson: “1 token per lesson”.
    - Lesson images: “X tokens per image” or “Y tokens per batch of 3”.
    - Lesson TTS: “Z tokens per lesson audio”.
    - Course: base tokens + per-lesson / per-image / per-audio (or reuse lesson/image/audio rules).
    - Student chat: “1 token per message”.
    - Teacher chat: “1 token per message”.
  - Optional: default limits per plan (e.g. Free = 100 tokens/month, Pro = 500, Institution = custom).
- **Usage & analytics**
  - View usage: which user/org, which action, how many tokens, when.
  - View limits and remaining balance per user/org if needed.

### 1.4 Teacher & student app (ERP)

- **Visible token balance**
  - Header or sidebar: “You have X tokens.”
  - Optional: “Buy more” → pricing/checkout or contact.
- **Before expensive actions**
  - If balance &lt; cost, show “Not enough tokens” and block or prompt to buy.
- **History (optional)**
  - “Token usage history” (last N actions with cost).

### 1.5 ERP pricing page

- **Current**: Free / Pro / Institution with fixed limits (exams per month, AI sessions).
- **New**: Add **token-based** offering:
  - Explain that AI features use tokens.
  - Packs: e.g. “100 tokens – $X”, “500 tokens – $Y”, “1000 tokens – $Z”.
  - Optionally keep Free tier as “N free tokens per month” and Pro/Institution as “included tokens + ability to buy more”.
  - CTA: “Buy tokens” / “Get started” / “Contact sales” for Institution.

---

## 2. Data model (high level)

### 2.1 New / extended tables (Supabase)

- **`token_balances`** (or add to `profiles`)
  - `profile_id` (UUID, FK profiles).
  - `balance` (integer, default 0) — current tokens.
  - `updated_at`.
  - Option: one row per profile; or store `token_balance` on `profiles` if you prefer fewer tables.

- **`token_usage_settings`** (platform-wide or per-tenant)
  - `id`, `key` (e.g. `exam_per_10_questions`, `lesson_generation`, `lesson_images_per_3`, `lesson_audio`, `course_base`, `student_chat_per_message`, `teacher_chat_per_message`), `tokens` (integer), `extra` (JSONB for params like “per 10 questions”), `updated_at`.
  - One row per “action type”; platform owner UI reads/writes these.

- **`token_transactions`** (audit + history)
  - `id`, `profile_id`, `amount` (positive = credit, negative = debit), `balance_after`, `action_type` (e.g. `exam_generation`, `lesson_generation`, `purchase`, `admin_adjustment`), `reference_id` (exam_id, lesson_id, payment_id, etc.), `metadata` (JSONB), `created_at`.
  - Enables “who / what / when” and “usage last 30 days” for platform owner.

- **`payments`** (or `token_purchases`)
  - `id`, `profile_id` (or `organization_id` for ERP), `amount_cents`, `currency`, `status` (`pending`, `completed`, `failed`, `refunded`), `tokens_granted`, `payment_method`, `external_id` (Stripe etc.), `created_at`, `paid_at`.
  - Platform owner “payments” view reads from here (and optionally from Stripe).

### 2.2 Where to store balance

- **Option A**: New table `token_balances(profile_id, balance, updated_at)`.
- **Option B**: Add `token_balance` (integer) to `profiles`.
- Recommendation: **Option A** for clearer separation and easier constraint (e.g. balance ≥ 0). Use a single row per profile.

---

## 3. Token cost configuration (platform owner)

- **Storage**: `token_usage_settings` table with rows like:
  - `exam_per_10_questions` → 1 token (meaning 10 questions = 1 token).
  - `lesson_generation` → 1 token.
  - `lesson_images_per_batch` → 5 tokens, `batch_size` → 3 (e.g. 3 images = 5 tokens).
  - `lesson_audio` → 3 tokens.
  - `course_base` → 2 tokens; then course can add lesson/image/audio costs by formula.
  - `student_chat_per_message` → 1 token.
  - `teacher_chat_per_message` → 1 token.
- **API**: CRUD for these settings (platform-owner only). App and API server read these to compute cost before/after each action.
- **Defaults**: Seed with the examples above so the product works before platform owner customizes.

---

## 4. Deduction flow (every AI usage)

1. **Resolve profile** (teacher or student) from request/session.
2. **Resolve action type** (e.g. `exam_generation`, `lesson_generation`, `lesson_audio`, `student_chat`, etc.).
3. **Compute cost**: Read `token_usage_settings`, compute tokens for this action (e.g. questions count / 10, images count / 3 * 5, etc.).
4. **Check balance**: If `balance < cost`, return error “Insufficient tokens” and do not call AI.
5. **Deduct**: Decrease `token_balances.balance` by `cost`; insert row in `token_transactions` (negative amount, `balance_after`, `action_type`, `reference_id`).
6. **Run AI** (exam gen, lesson gen, chat, etc.).
7. Optionally store `tokens_used` on the entity (exam, lesson) for display; the source of truth for billing is `token_transactions`.

Same flow for both **ERP app** (Next.js API routes / server actions) and **API server** (Fastify): a shared service or package that takes `profile_id`, `action_type`, and action params (e.g. question_count, image_count) and returns `{ allowed, cost, newBalance }` or error.

---

## 5. Implementation phases

### Phase 1 – Foundation (DB + settings + balance)

- Add Supabase migrations:
  - `token_balances(profile_id, balance, updated_at)`.
  - `token_usage_settings(id, key, tokens, extra, updated_at)`.
  - `token_transactions(id, profile_id, amount, balance_after, action_type, reference_id, metadata, created_at)`.
  - `payments` (or `token_purchases`) for future use.
- Seed default `token_usage_settings` (exam, lesson, images, audio, course, student chat, teacher chat).
- Platform owner UI: **Token usage settings** page (list + edit cost per action).
- Service: `getTokenCost(actionType, params)` and `deductTokens(profileId, cost, actionType, referenceId)` with transaction + `token_transactions` insert.
- Give new users a default starting balance (e.g. 0 or a small trial amount) so existing flows don’t break before “purchase” exists.

### Phase 2 – Deduct at every AI usage point

- **Exam generation** (API + ERP): Before calling `questionGenerator.generateFromDocument`, compute cost from question count and settings; deduct; then generate.
- **Lesson generation** (API + ERP): Before `generateLesson`, compute cost (1 lesson + optional images + optional audio from settings); deduct; then generate. If lesson includes images/audio, use same cost logic as settings.
- **Lesson audio only** (regenerate): Deduct lesson_audio cost before calling TTS.
- **Course generation** (ERP): Before `generateCourse`, compute cost (base + per-lesson + per-image + per-audio from settings); deduct; then run course gen.
- **Student chat** (ERP): Before calling chatbot, deduct 1 (or configured) token per message.
- **Teacher chat** (ERP): Same.
- All deduction points must use the shared service and handle “insufficient tokens” (return 402 or user-friendly message and block action).

### Phase 3 – Platform owner: payments & usage views

- **Payments** page: List from `payments` (who, amount, when, tokens_granted, status). Optional: filters, export.
- **Usage** page: List from `token_transactions` (user, action, amount, balance_after, time). Optional: by org, by action type, date range.
- Optional: “Limit / plan” view (e.g. show plan and token allowance per org/user) if you introduce plan-based token caps.

### Phase 4 – Teacher & student: token display and gating

- **ERP app**: Fetch current balance (from `token_balances` or API) and show in header/sidebar (“X tokens”).
- Before any charged action: check balance; if insufficient, show “Not enough tokens – buy more” and block.
- Optional: “Token usage history” page or section (last N `token_transactions` for current user).

### Phase 5 – ERP pricing page & token purchasing

- **Pricing page**: Add token packs (e.g. 100 / 500 / 1000 tokens with prices). Keep or adjust Free/Pro/Institution (e.g. “Free: 50 tokens/month”, “Pro: 200 tokens + buy more”).
- **Buy flow**: “Buy tokens” → select pack → checkout (Stripe or placeholder). On success: create `payments` row, add to `token_balances`, insert credit in `token_transactions`.
- Optional: webhook from Stripe to credit tokens.

---

## 6. Files / areas to touch (by phase)

- **Phase 1**: `supabase/migrations/`, new package or `packages/core` for token service, platform-owner routes and pages (token settings), seed for `token_usage_settings`.
- **Phase 2**: `packages/api-server` (teacher exam, lesson, course), `apps/erp-app` (lesson gen, course gen, student chat, teacher chat), shared token service.
- **Phase 3**: Platform owner dashboard: new pages “Payments”, “Usage” (and maybe “Token settings” if not in Phase 1).
- **Phase 4**: ERP app layout/header/sidebar, teacher/student pages that trigger AI, optional usage history component.
- **Phase 5**: `apps/erp-app/src/app/pricing/page.tsx`, new “Buy tokens” page and API (Stripe or mock), webhook if needed.

---

## 7. Edge cases

- **Concurrent use**: Deduct in a transaction (e.g. `SELECT balance FOR UPDATE`, check, subtract, update, insert transaction row) to avoid over-spend.
- **Failed AI call**: If deduction succeeds but AI fails, either refund (insert positive transaction) or leave as “consumed” and document policy. Recommendation: refund on clear server failure.
- **ERP vs ERP**: Same tables and service can serve both; ERP can use `organization_id` on payments and optionally org-level token pool later.
- **Defaults**: If a key is missing in `token_usage_settings`, use a safe default (e.g. 0 or 1 token) so the app doesn’t break.

---

## 8. Success criteria

- Platform owner can set and edit token cost for each action type.
- Every listed AI feature deducts tokens according to these settings.
- Teachers and students see their token balance; actions are blocked with a clear message when balance is insufficient.
- Platform owner can see payments (who, what, when) and usage (who, action, tokens, when).
- ERP pricing page explains token-based usage and offers token packs (and optionally plan-based included tokens).

This plan is the single source of truth for implementation; we will implement Phase 1 first, then Phase 2, and so on.
