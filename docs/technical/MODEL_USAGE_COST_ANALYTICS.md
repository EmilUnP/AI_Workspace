# Model Usage and Estimated Cost Analytics

## Purpose

This document explains how `Platform Owner -> Real token usage` calculates:

- model-level token usage,
- estimated USD cost by model,
- overall totals for the selected time range.

It is an **analytics view** for monitoring and planning. It is not a billing invoice.

---

## Data Sources

1. **Usage source**
   - `public.token_transactions`
   - Uses negative token rows (`amount < 0`) as usage events.
   - Reads AI telemetry from `metadata`.

2. **Pricing source**
   - `public.model_pricing_settings`
   - Editable by Platform Owner.
   - Stores USD rates per 1M input/output tokens.

---

## Metadata Fields Used

The analytics pipeline normalizes metadata and reads these fields:

- Model key: `model_used` (fallbacks: `ai_model_used`, `model`)
- Input tokens: `input_tokens`, `prompt_tokens`
- Output tokens: `output_tokens`, `completion_tokens`
- Total tokens: `total_tokens`, `tokens_used`
- Additional optional buckets:
  - image: `image_prompt_tokens`, `image_completion_tokens`
  - tts: `tts_prompt_tokens`, `tts_completion_tokens`
  - translation: `translation_input_tokens`, `translation_output_tokens`, etc.

If model metadata is missing, rows are grouped under `unknown`.

---

## Cost Formula

For each usage record:

- `input_cost = input_tokens * (input_cost_per_1m_tokens_usd / 1_000_000)`
- `output_cost = output_tokens * (output_cost_per_1m_tokens_usd / 1_000_000)`
- `estimated_cost = input_cost + output_cost`

Aggregates are then computed per model and for total.

---

## Important Assumptions

- Cost values are estimates based on configured rates.
- Internal token billing and provider billing are different concepts.
- If usage metadata is incomplete, estimated cost can be lower than real provider cost.
- Changing pricing rates affects future analytics interpretation and should be tracked internally.

---

## Maintenance Workflow

When Gemini pricing changes:

1. Open `/platform-owner/real-token-usage`.
2. In **Model pricing controls**, update:
   - display name (if needed),
   - source URL,
   - input/output cost per 1M tokens.
3. Save each updated row.
4. Validate totals in the model usage table.
5. Add release note entry to `CHANGELOG.md` for pricing update transparency.

---

## Initial Seed Reference

Default seed rows are created by migration:

- `supabase/migrations/20260414150000_add_model_pricing_settings.sql`

Seed source URL:

- https://ai.google.dev/gemini-api/docs/pricing

