export async function generateLessonAudioWithUsage(
  _lessonId: string,
  _title: string,
  _contentText: string,
  _language: string
) {
  return {
    audioUrl: null,
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  }
}
