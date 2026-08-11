-- Update TTS workload to current Gemini Flash TTS on OpenRouter.
-- Older google/gemini-2.5-*-preview-tts slugs are often unavailable / fail.
-- App code must use Gemini voices (Zephyr, Kore, …), not OpenAI "nova".

SET search_path TO public;

UPDATE ai_workload_policies
SET
  model_chain = ARRAY[
    'google/gemini-3.1-flash-tts-preview',
    'google/gemini-2.5-flash-preview-tts',
    'google/gemini-2.5-pro-preview-tts'
  ],
  prefer_zdr = FALSE,
  notes = 'Lesson TTS (Gemini via OpenRouter /audio/speech; Gemini voices e.g. Zephyr; ZDR off for speech)',
  updated_at = now()
WHERE workload = 'tts';
