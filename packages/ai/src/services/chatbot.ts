import { GeminiChat, generateContent } from '../gemini'
import {
  createChatbotSystemPrompt,
  createConceptExplanationPrompt,
  createProblemSolvingPrompt,
} from '../prompts/chatbot'
import type { ChatMessage, ChatContext, SendMessageResponse } from '@eduator/core/types/chatbot'
import { generateId } from '@eduator/core/utils/generate-id'
import { AI_MODELS } from '@eduator/config'

/**
 * AI Teaching Assistant Chatbot Service
 */
export class ChatbotService {
  private chat: GeminiChat
  private context: ChatContext
  private messageHistory: ChatMessage[] = []

  constructor(context: ChatContext) {
    this.context = context

    // Initialize chat with system prompt
    const systemPrompt = createChatbotSystemPrompt({
      studentGradeLevel: context.student_grade_level,
      subject: context.subject,
      explanationStyle: context.student_preferences?.explanation_style,
      language: context.student_preferences?.language,
    })

    this.chat = new GeminiChat({
      model: 'flash', // Use Flash for faster responses
      systemPrompt,
    })
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(message: string): Promise<SendMessageResponse> {
    const userMessage: ChatMessage = {
      id: generateId(),
      conversation_id: '', // Will be set by caller
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }

    this.messageHistory.push(userMessage)

    const startTime = Date.now()

    try {
      const { text, tokensUsed } = await this.chat.sendMessage(message)

      const assistantMessage: ChatMessage = {
        id: generateId(),
        conversation_id: '',
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
        metadata: {
          tokens_used: tokensUsed,
          // Log the actual chat model from centralized config
          model_used: AI_MODELS.CHAT,
          response_time_ms: Date.now() - startTime,
        },
      }

      this.messageHistory.push(assistantMessage)

      // Generate follow-up suggestions
      const suggestedFollowUps = this.generateFollowUpSuggestions(message, text)

      return {
        conversation_id: '',
        message: assistantMessage,
        suggested_follow_ups: suggestedFollowUps,
      }
    } catch (error) {
      console.error('Chatbot error:', error)
      throw new Error(`Failed to get response: ${(error as Error).message}`)
    }
  }

  /**
   * Stream a response
   */
  async *sendMessageStream(message: string): AsyncGenerator<string> {
    const userMessage: ChatMessage = {
      id: generateId(),
      conversation_id: '',
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }

    this.messageHistory.push(userMessage)

    let fullResponse = ''

    for await (const chunk of this.chat.sendMessageStream(message)) {
      fullResponse += chunk
      yield chunk
    }

    const assistantMessage: ChatMessage = {
      id: generateId(),
      conversation_id: '',
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date().toISOString(),
    }

    this.messageHistory.push(assistantMessage)
  }

  /**
   * Explain a specific concept
   */
  async explainConcept(concept: string): Promise<SendMessageResponse> {
    const prompt = createConceptExplanationPrompt({
      concept,
      gradeLevel: this.context.student_grade_level || 'general',
      priorKnowledge: this.context.previous_topics,
      language: this.context.student_preferences?.language,
    })

    const { text, tokensUsed } = await generateContent(prompt, { model: 'pro' })

    const message: ChatMessage = {
      id: generateId(),
      conversation_id: '',
      role: 'assistant',
      content: text,
      timestamp: new Date().toISOString(),
      metadata: {
        tokens_used: tokensUsed,
        // This path uses the main text model (pro) via generateContent
        model_used: AI_MODELS.TEXT,
      },
    }

    this.messageHistory.push(message)

    return {
      conversation_id: '',
      message,
      suggested_follow_ups: [
        `Can you give me more examples of ${concept}?`,
        `How is ${concept} used in real life?`,
        `What are common mistakes with ${concept}?`,
      ],
    }
  }

  /**
   * Help solve a problem
   */
  async helpWithProblem(
    problem: string,
    studentAttempt?: string
  ): Promise<SendMessageResponse> {
    const prompt = createProblemSolvingPrompt({
      problem,
      subject: this.context.subject || 'general',
      studentAttempt,
      gradeLevel: this.context.student_grade_level || 'general',
    })

    const { text, tokensUsed } = await generateContent(prompt, { model: 'pro' })

    const message: ChatMessage = {
      id: generateId(),
      conversation_id: '',
      role: 'assistant',
      content: text,
      timestamp: new Date().toISOString(),
      metadata: {
        tokens_used: tokensUsed,
        model_used: AI_MODELS.TEXT,
      },
    }

    this.messageHistory.push(message)

    return {
      conversation_id: '',
      message,
      suggested_follow_ups: [
        'Can you explain that step again?',
        'Why did we use that approach?',
        'Can I try a similar problem?',
      ],
    }
  }

  /**
   * Update context
   */
  updateContext(context: Partial<ChatContext>) {
    this.context = { ...this.context, ...context }
  }

  /**
   * Get message history
   */
  getHistory(): ChatMessage[] {
    return this.messageHistory
  }

  /**
   * Clear conversation
   */
  clearHistory() {
    this.messageHistory = []
    this.chat.clearHistory()
  }

  /**
   * Generate follow-up question suggestions
   */
  private generateFollowUpSuggestions(_userMessage: string, response: string): string[] {
    // Simple heuristic-based suggestions
    const suggestions: string[] = []

    // Check for concept mentions
    if (response.toLowerCase().includes('example')) {
      suggestions.push('Can you give me more examples?')
    }

    if (response.toLowerCase().includes('step')) {
      suggestions.push('Can you explain that step in more detail?')
    }

    if (response.toLowerCase().includes('formula') || response.toLowerCase().includes('equation')) {
      suggestions.push('When would I use this formula?')
    }

    // Default suggestions if none generated
    if (suggestions.length === 0) {
      suggestions.push(
        'Can you explain that in a different way?',
        'How does this relate to what we learned before?',
        'What should I study next?'
      )
    }

    return suggestions.slice(0, 3)
  }
}

/**
 * Create a new chatbot instance
 */
export function createChatbot(context: ChatContext): ChatbotService {
  return new ChatbotService(context)
}
