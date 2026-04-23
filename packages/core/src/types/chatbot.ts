/**
 * AI Chatbot Types
 */

export interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: ChatMessageMetadata
}

export interface ChatMessageMetadata {
  tokens_used?: number
  input_tokens?: number
  output_tokens?: number
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  model_used?: string
  response_time_ms?: number
  sources?: ChatSource[]
  suggestions?: string[]
  was_helpful?: boolean
}

export interface ChatSource {
  type: 'lesson' | 'exam' | 'document' | 'web'
  title: string
  url?: string
  snippet?: string
}

export interface ChatConversation {
  id: string
  student_id: string
  class_id: string | null
  title: string | null
  context: ChatContext
  messages: ChatMessage[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ChatContext {
  student_grade_level?: string
  subject?: string
  current_lesson_id?: string
  current_exam_id?: string
  learning_objectives?: string[]
  previous_topics?: string[]
  student_preferences?: StudentChatPreferences
}

export interface StudentChatPreferences {
  explanation_style: 'simple' | 'detailed' | 'visual' | 'example_based'
  language: string
  reading_level: 'elementary' | 'middle_school' | 'high_school' | 'college'
}

export interface SendMessageRequest {
  conversation_id?: string
  message: string
  context?: Partial<ChatContext>
  attachments?: ChatAttachment[]
}

export interface ChatAttachment {
  type: 'image' | 'document'
  url: string
  name: string
}

export interface SendMessageResponse {
  conversation_id: string
  message: ChatMessage
  suggested_follow_ups?: string[]
}

/**
 * Chatbot Configuration
 */
export interface ChatbotConfig {
  model: string
  temperature: number
  max_tokens: number
  system_prompt: string
  safety_settings: SafetySettings
  allowed_topics: string[]
  blocked_topics: string[]
}

export interface SafetySettings {
  block_harmful_content: boolean
  block_adult_content: boolean
  block_violence: boolean
  block_hate_speech: boolean
  custom_filters: string[]
}

/**
 * Chatbot Analytics
 */
export interface ChatbotAnalytics {
  time_range: {
    start_date: string
    end_date: string
  }
  total_conversations: number
  total_messages: number
  unique_students: number
  average_messages_per_conversation: number
  average_response_time_ms: number
  satisfaction_rate: number
  topic_distribution: TopicDistribution[]
  peak_usage_hours: number[]
  common_questions: CommonQuestion[]
}

export interface TopicDistribution {
  topic: string
  count: number
  percentage: number
}

export interface CommonQuestion {
  question: string
  frequency: number
  average_satisfaction: number
}
