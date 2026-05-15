export type TeacherChatContext = {
  grade_level?: string
  organization_id?: string
  document_ids?: string[]
  preferences?: {
    language?: string
    explanation_style?: 'short' | 'detailed'
  }
}

export function createTeacherChatbot(_context: TeacherChatContext) {
  return {
    async sendMessage(message: string) {
      return {
        message: {
          content: `AI chat is running in clean mode. You said: ${message}`,
          metadata: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            model_used: 'clean-mode-placeholder',
          },
        },
        sources: [],
        suggested_follow_ups: [],
      }
    },
  }
}
