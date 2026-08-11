-- Force TTS workload onto the only current Gemini speech model on OpenRouter.
-- Chat models like google/gemini-2.5-flash must NEVER be used for /audio/speech
-- (they produce empty 0-token activity rows and no audio).
-- Dead slugs google/gemini-2.5-*-preview-tts are removed from OpenRouter speech catalog.

SET search_path TO public;

UPDATE ai_workload_policies
SET
  model_chain = ARRAY['google/gemini-3.1-flash-tts-preview'],
  prefer_zdr = FALSE,
  is_enabled = TRUE,
  notes = 'Lesson TTS via OpenRouter /audio/speech — ONLY speech models (gemini-3.1-flash-tts-preview). Voice: Zephyr. Format: pcm.',
  updated_at = now()
WHERE workload = 'tts';
