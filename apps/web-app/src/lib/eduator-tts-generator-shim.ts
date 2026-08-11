/**
 * @deprecated Lesson TTS must go through the backend (`POST /v1/lessons/:id/audio`).
 * This shim exists only so old imports fail loudly instead of silently returning null.
 */
export async function generateLessonAudioWithUsage(
  _lessonId: string,
  _title: string,
  _contentText: string,
  _language: string
): Promise<never> {
  throw new Error(
    'TTS shim is disabled. Use backend POST /v1/lessons/:id/audio (OpenRouter Gemini TTS).'
  )
}
