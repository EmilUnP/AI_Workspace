/**
 * Teacher AI Chatbot Service with RAG Support
 * Enhanced chatbot for teachers with document-based RAG capabilities
 */

import { GeminiChat, generateJSON } from '../gemini'
import { getRelevantContentFromDocuments } from './document-rag'
import type { ChatMessage } from '@eduator/core/types/chatbot'
import { generateId } from '@eduator/core/utils/generate-id'
import { AI_MODELS } from '@eduator/config'

export interface TeacherChatContext {
  subject?: string
  grade_level?: string
  organization_id?: string
  document_ids?: string[] // Documents to use for RAG
  preferences?: {
    language?: string
    explanation_style?: 'short' | 'simple' | 'detailed' | 'visual' | 'example_based'
  }
}

export interface TeacherChatResponse {
  message: ChatMessage
  sources?: Array<{
    type: 'document'
    document_id: string
    document_title: string
    snippet: string
  }>
  suggested_follow_ups?: string[]
}

/**
 * Teacher Chatbot Service with RAG
 */
export class TeacherChatbotService {
  private chat: GeminiChat
  private context: TeacherChatContext
  private messageHistory: ChatMessage[] = []

  constructor(context: TeacherChatContext) {
    this.context = context

    // Create teacher-specific system prompt
    const systemPrompt = this.createTeacherSystemPrompt(context)

    this.chat = new GeminiChat({
      model: 'flash',
      systemPrompt,
    })
  }

  /**
   * Detect language from user message
   */
  private async detectLanguage(text: string): Promise<string> {
    try {
      const prompt = `Detect the language of the following text and respond with ONLY the two-letter language code (e.g., en, az, ru, tr):

"${text.substring(0, 500)}"

Respond in JSON format:
{
  "language_code": "two-letter code"
}`

      const { data } = await generateJSON<{ language_code: string }>(prompt, {
        model: 'flash',
      })

      // Map common language codes
      const langMap: Record<string, string> = {
        'az': 'Azerbaijani',
        'ru': 'Russian',
        'en': 'English',
        'tr': 'Turkish',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
      }

      const detectedLang = data.language_code?.toLowerCase() || 'en'
      return langMap[detectedLang] || 'Azerbaijani'
    } catch (error) {
      console.warn('[Teacher Chat] Language detection failed, defaulting to Azerbaijani:', error)
      return 'Azerbaijani'
    }
  }

  /**
   * Send a message with optional RAG from documents
   */
  async sendMessage(
    message: string,
    userId: string,
    useRAG: boolean = true
  ): Promise<TeacherChatResponse> {
    // Detect language from user message
    const detectedLanguage = await this.detectLanguage(message)
    
    // Update context with detected language
    if (detectedLanguage !== this.context.preferences?.language) {
      this.context.preferences = {
        ...this.context.preferences,
        language: detectedLanguage,
      }
      // Recreate chat with new language-specific system prompt
      const systemPrompt = this.createTeacherSystemPrompt(this.context)
      this.chat = new GeminiChat({
        model: 'flash',
        systemPrompt,
      })
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      conversation_id: '',
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }

    this.messageHistory.push(userMessage)

    const startTime = Date.now()
    let ragContext = ''
    let sources: TeacherChatResponse['sources'] = []

    try {
      // If RAG is enabled and documents are provided, get relevant content
      if (useRAG && this.context.document_ids && this.context.document_ids.length > 0) {
        try {
          console.log(`[Teacher Chat] Using RAG with ${this.context.document_ids.length} document(s)`)
          ragContext = await getRelevantContentFromDocuments(
            this.context.document_ids,
            userId,
            message, // Use the message as the query
            5 // Get top 5 chunks per document
          )

          if (ragContext && ragContext.trim().length > 50) {
            // Get document titles for sources
            const { createAdminClient } = await import('@eduator/auth/supabase/admin')
            const adminSupabase = createAdminClient()
            
            const { data: documents } = await adminSupabase
              .from('documents')
              .select('id, title')
              .in('id', this.context.document_ids)

            if (documents) {
              sources = documents.map(doc => ({
                type: 'document' as const,
                document_id: doc.id,
                document_title: doc.title,
                snippet: ragContext.substring(0, 200) + '...', // First 200 chars as snippet
              }))
            }

            // Enhance the message with RAG context and language instruction
            const languageNote = detectedLanguage !== 'Azerbaijani'
              ? `\n\n⚠️ IMPORTANT: Respond EXCLUSIVELY in ${detectedLanguage}. Translate any content from documents to ${detectedLanguage}.\n`
              : ''
            const enhancedMessage = `Context from your documents:\n\n${ragContext}\n\n---\n\nUser question: ${message}${languageNote}`
            const { text, tokensUsed, promptTokens, completionTokens, totalTokens } = await this.chat.sendMessage(enhancedMessage)

            const assistantMessage: ChatMessage = {
              id: generateId(),
              conversation_id: '',
              role: 'assistant',
              content: text,
              timestamp: new Date().toISOString(),
              metadata: {
                tokens_used: tokensUsed,
                input_tokens: promptTokens ?? tokensUsed,
                output_tokens: completionTokens ?? 0,
                prompt_tokens: promptTokens ?? tokensUsed,
                completion_tokens: completionTokens ?? 0,
                total_tokens: totalTokens ?? tokensUsed,
                // Use centralized chat model identifier for logging/analytics
                model_used: AI_MODELS.CHAT,
                response_time_ms: Date.now() - startTime,
                sources: sources.map(s => ({
                  type: 'document',
                  title: s.document_title,
                  url: `/teacher/documents/${s.document_id}`,
                  snippet: s.snippet,
                })),
              },
            }

            this.messageHistory.push(assistantMessage)

            return {
              message: assistantMessage,
              sources,
              suggested_follow_ups: this.generateFollowUpSuggestions(message, text),
            }
          }
        } catch (ragError) {
          console.warn('[Teacher Chat] RAG failed, falling back to general chat:', ragError)
          // Fall through to general chat
        }
      }

      // General chat without RAG (or RAG failed)
      const languageNote = detectedLanguage !== 'Azerbaijani'
        ? `\n\n⚠️ IMPORTANT: Respond EXCLUSIVELY in ${detectedLanguage}.\n`
        : ''
      const { text, tokensUsed, promptTokens, completionTokens, totalTokens } = await this.chat.sendMessage(message + languageNote)

      const assistantMessage: ChatMessage = {
        id: generateId(),
        conversation_id: '',
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
        metadata: {
          tokens_used: tokensUsed,
          input_tokens: promptTokens ?? tokensUsed,
          output_tokens: completionTokens ?? 0,
          prompt_tokens: promptTokens ?? tokensUsed,
          completion_tokens: completionTokens ?? 0,
          total_tokens: totalTokens ?? tokensUsed,
          model_used: AI_MODELS.CHAT,
          response_time_ms: Date.now() - startTime,
        },
      }

      this.messageHistory.push(assistantMessage)

      return {
        message: assistantMessage,
        suggested_follow_ups: this.generateFollowUpSuggestions(message, text),
      }
    } catch (error) {
      console.error('[Teacher Chat] Error:', error)
      throw new Error(`Failed to get response: ${(error as Error).message}`)
    }
  }

  /**
   * Create teacher-specific system prompt
   */
  private createTeacherSystemPrompt(context: TeacherChatContext): string {
    const { subject, grade_level, preferences } = context
    const language = preferences?.language || 'Azerbaijani'
    const style = preferences?.explanation_style || 'detailed'

    const styleInstructions: Record<string, string> = {
      short: 'Keep responses brief and to the point. Use 1–3 short sentences or bullet points. No long paragraphs. Answer only what was asked.',
      simple: 'Use clear, concise language. Focus on practical, actionable advice.',
      detailed: 'Provide comprehensive explanations with examples and best practices.',
      visual: 'Use analogies, metaphors, and structured formats to explain concepts.',
      example_based: 'Include multiple real-world examples and case studies.',
    }

    // Language-specific instructions
    const languageInstruction = language !== 'Azerbaijani'
      ? `\n\n⚠️ CRITICAL LANGUAGE REQUIREMENT ⚠️\nYou MUST respond EXCLUSIVELY in ${language} language:\n- ALL your responses must be in ${language}\n- ALL explanations must be in ${language}\n- ALL examples must be in ${language}\n- ALL suggestions must be in ${language}\n- Use proper ${language} grammar, vocabulary, and spelling\n- Do NOT mix languages - use ONLY ${language}\n- If you need to translate content from documents, translate it to ${language}\n\nIf you generate ANY content in a different language when ${language} is requested, you have FAILED the task.\n`
      : ''

    return `You are EduBot, an AI teaching assistant designed to help teachers with their educational work. Your role is to support teachers in lesson planning, exam creation, teaching strategies, and educational best practices.

## Teacher Context:
${subject ? `- Subject: ${subject}` : ''}
${grade_level ? `- Grade Level: ${grade_level}` : ''}
- Response Language: ${language}${languageInstruction}

## Communication Style:
${styleInstructions[style]}

## Core Capabilities:
1. **Lesson Planning**: Help create comprehensive lesson plans, learning objectives, and teaching activities
2. **Exam Creation**: Assist with generating questions, creating assessments, and designing rubrics
3. **Teaching Strategies**: Provide evidence-based teaching methodologies and classroom management tips
4. **Curriculum Development**: Help align content with standards and create scope and sequence
5. **Student Assessment**: Suggest formative and summative assessment strategies
6. **Differentiation**: Provide ideas for accommodating diverse learners
7. **Educational Technology**: Recommend tools and resources for enhancing instruction

## Response Guidelines:
- Be practical and actionable - teachers need usable advice
- Reference educational research and best practices when relevant
- Provide step-by-step guidance for complex tasks
- Include examples and templates when helpful
- Integrate document-grounded insights naturally without stock lead-ins like "According to the text..." or "The document states...". Keep language direct and professional.
- Suggest related topics or follow-up questions
- Use markdown formatting for better readability. When comparing items or showing structured data, use markdown tables: header row | A | B |, separator | --- | --- |, then data rows so they display clearly.

## When Using Document Context:
- If the user's question relates to their uploaded documents, prioritize that information
- Cite which document(s) you're referencing
- Combine document content with general educational knowledge
- If document content is insufficient, supplement with your knowledge
- If documents are in a different language, translate relevant content to ${language}

## Document Upload + RAG Explainer:
- If the user asks how document upload works (or what happens after upload), always explain the flow clearly in plain language:
  1) File upload and initial validation (type/size)
  2) Processing status changes (pending -> processing -> completed/failed)
  3) Text extraction from supported file types
  4) Text chunking for retrieval
  5) Embedding generation and RAG indexing
  6) "Ready for AI" means retrieval can be used for chats/exam/lesson generation
- Also mention what "failed" or "low quality" usually means (e.g., scanned PDFs, poor extractable text) and suggest re-uploading selectable-text files.
- Keep this explanation structured as concise bullets so teachers can quickly understand the pipeline.

## Restrictions:
- Stay focused on educational topics
- Provide age-appropriate content suggestions
- Be honest about limitations
- Don't create content that violates copyright or academic integrity

Remember: Your goal is to be a helpful teaching assistant that saves teachers time and enhances their instruction.`
  }

  /**
   * Update context (e.g., change documents, subject, etc.)
   */
  updateContext(context: Partial<TeacherChatContext>) {
    this.context = { ...this.context, ...context }
    
    // Recreate chat with new system prompt if context changed significantly
    if (context.subject || context.grade_level || context.preferences) {
      const systemPrompt = this.createTeacherSystemPrompt(this.context)
      this.chat = new GeminiChat({
        model: 'flash',
        systemPrompt,
      })
    }
  }

  /**
   * Get message history
   */
  getHistory(): ChatMessage[] {
    return this.messageHistory
  }

  /**
   * Load message history
   */
  loadHistory(messages: ChatMessage[]) {
    this.messageHistory = messages
    // Rebuild chat history
    this.chat.clearHistory()
    for (const msg of messages) {
      if (msg.role === 'user') {
        this.chat.sendMessage(msg.content) // This will add to history
      }
    }
  }

  /**
   * Clear conversation
   */
  clearHistory() {
    this.messageHistory = []
    this.chat.clearHistory()
  }

  /**
   * Generate follow-up suggestions
   */
  private generateFollowUpSuggestions(_userMessage: string, response: string): string[] {
    const suggestions: string[] = []

    // Context-aware suggestions based on response content
    if (response.toLowerCase().includes('lesson')) {
      suggestions.push('Can you help me create a detailed lesson plan?')
    }
    if (response.toLowerCase().includes('exam') || response.toLowerCase().includes('question')) {
      suggestions.push('How can I create better exam questions?')
    }
    if (response.toLowerCase().includes('strategy') || response.toLowerCase().includes('method')) {
      suggestions.push('What other teaching strategies would work here?')
    }
    if (response.toLowerCase().includes('assessment')) {
      suggestions.push('What types of assessments should I use?')
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push(
        'Can you provide more examples?',
        'What are best practices for this?',
        'How can I improve this?'
      )
    }

    return suggestions.slice(0, 3)
  }
}

/**
 * Create a new teacher chatbot instance
 */
export function createTeacherChatbot(context: TeacherChatContext): TeacherChatbotService {
  return new TeacherChatbotService(context)
}
