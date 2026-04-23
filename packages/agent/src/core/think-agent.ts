import type {
  AgentOptions,
  AgentResponse,
  ProcessOptions,
  UserContext,
  IntentClassification,
  ToolCall,
} from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { SqlExecutor } from '../executor/sql'
import { getGeminiFlash, generateJSON } from '@eduator/ai/gemini'
import { transcribeAudio, type STTOptions } from '@eduator/ai/stt-generator'
import {
  INTENT_CLASSIFICATION_PROMPT,
} from '../prompts'
import { SQLReflection } from './reflection'
import { logger } from '../logger'

/**
 * Think Agent - Read-only mode
 * Only handles inquiries (data questions) via SQL queries
 * Cannot perform any create/update/delete operations
 */
export class ThinkAgent {
  private context: UserContext
  private client: SupabaseClient

  constructor(options: AgentOptions) {
    this.context = {
      userId: options.userId,
      profileType: options.profileType,
      organizationId: options.organizationId,
    }
    this.client = options.supabaseClient || createAdminClient()
  }

  /**
   * Process a user message and return a response
   * Supports both text and audio input
   * Only handles read-only inquiries
   */
  async process(options: ProcessOptions): Promise<AgentResponse> {
    const { message, audio, audioMimeType, audioLanguageCode, includeMetadata, showSql } = options

    logger.debug('[ThinkAgent] ========================================')
    logger.debug('[ThinkAgent] Processing new request (READ-ONLY MODE)')
    logger.debug('[ThinkAgent] Has text message:', !!message)
    logger.debug('[ThinkAgent] Has audio input:', !!audio)
    logger.debug('[ThinkAgent] User ID:', this.context.userId)
    logger.debug('[ThinkAgent] Profile Type:', this.context.profileType)
    logger.debug('[ThinkAgent] Organization ID:', this.context.organizationId)

    try {
      // If audio is provided, transcribe it first
      let processedMessage = message || ''
      
      if (audio) {
        logger.debug('[ThinkAgent] Transcribing audio input...')
        try {
          const sttOptions: STTOptions = {
            languageCode: audioLanguageCode,
            encoding: audioMimeType ? this.mimeTypeToEncoding(audioMimeType) : undefined,
            enableAutomaticPunctuation: true,
          }
          
          const transcription = await transcribeAudio(audio, sttOptions)
          processedMessage = transcription.text
          
          logger.debug('[ThinkAgent] Audio transcription complete:', {
            text: processedMessage.substring(0, 100) + (processedMessage.length > 100 ? '...' : ''),
            confidence: transcription.confidence,
            languageCode: transcription.languageCode,
          })
          
          if (!processedMessage || processedMessage.trim().length === 0) {
            return {
              text: "I couldn't understand the audio input. Please try speaking more clearly or check your microphone settings.",
              error: 'Empty transcription result',
            }
          }
        } catch (error) {
          logger.error('[ThinkAgent] Audio transcription error:', error)
          return {
            text: `I encountered an error while processing the audio: ${error instanceof Error ? error.message : 'Unknown error'}. Please try typing your message instead.`,
            error: error instanceof Error ? error.message : 'Audio transcription failed',
          }
        }
      }

      if (!processedMessage || processedMessage.trim().length === 0) {
        return {
          text: 'Please provide a message or audio input to process.',
          error: 'No input provided',
        }
      }

      logger.debug('[ThinkAgent] Processed message:', processedMessage)

      // Classify user intent
      logger.debug('[ThinkAgent] Classifying intent...')
      const intent = await this.classifyIntent(processedMessage)
      logger.debug('[ThinkAgent] Intent classification result:', {
        intent: intent.intent,
        tools: intent.tools,
        confidence: intent.confidence,
      })

      // Check if user is trying to perform an action (create/update/delete)
      if (intent.intent === 'action' && intent.tools && intent.tools.length > 0) {
        logger.debug('[ThinkAgent] Action detected - redirecting to agent mode')
        
        // Detect what the user is trying to do for a friendlier message
        let actionDescription = 'this action'
        if (intent.tools.includes('create_organization')) {
          actionDescription = 'creating an organization'
        } else if (intent.tools.includes('create_user') || intent.tools.includes('create_teacher') || intent.tools.includes('create_student')) {
          actionDescription = 'creating a user'
        } else if (intent.tools.includes('create_class')) {
          actionDescription = 'creating a class'
        } else if (intent.tools.length > 1) {
          actionDescription = 'performing this action'
        }
        
        return {
          text: `I can only view and answer questions about your data in Think Mode.\n\nTo ${actionDescription}, please switch to **Agent Mode** using the toggle button above.`,
          error: 'Action not allowed in Think Mode',
        }
      }

      // Handle inquiry (data question) - this is the only allowed operation
      if (intent.intent === 'inquiry') {
        logger.debug('[ThinkAgent] Routing to inquiry handler')
        const response = await this.handleInquiry(processedMessage, intent.suggestedSql, showSql, includeMetadata)
        logger.debug('[ThinkAgent] Inquiry response:', { 
          textLength: response.text?.length, 
          hasError: !!response.error,
          rowCount: response.rowCount 
        })
        logger.debug('[ThinkAgent] ========================================')
        return response
      }

      // Handle general conversation
      logger.debug('[ThinkAgent] Routing to conversation handler')
      const response = await this.handleConversation(processedMessage)
      logger.debug('[ThinkAgent] Conversation response:', { 
        textLength: response.text?.length, 
        hasError: !!response.error 
      })
      logger.debug('[ThinkAgent] ========================================')
      return response
    } catch (error) {
      logger.error('[ThinkAgent] ========================================')
      logger.error('[ThinkAgent] FATAL ERROR in process()')
      logger.error('[ThinkAgent] Error:', error)
      logger.error('[ThinkAgent] Error message:', error instanceof Error ? error.message : 'Unknown error')
      logger.error('[ThinkAgent] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      logger.error('[ThinkAgent] Input that caused error:', { message, hasAudio: !!audio })
      logger.error('[ThinkAgent] ========================================')
      return {
        text: `I apologize, but I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question or contact support if the issue persists.`,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Convert MIME type to Google Cloud Speech encoding format
   */
  private mimeTypeToEncoding(mimeType: string): 'LINEAR16' | 'FLAC' | 'OGG_OPUS' | 'MP3' | 'WEBM_OPUS' {
    const mapping: Record<string, 'LINEAR16' | 'FLAC' | 'OGG_OPUS' | 'MP3' | 'WEBM_OPUS'> = {
      'audio/wav': 'LINEAR16',
      'audio/x-wav': 'LINEAR16',
      'audio/wave': 'LINEAR16',
      'audio/flac': 'FLAC',
      'audio/ogg': 'OGG_OPUS',
      'audio/opus': 'OGG_OPUS',
      'audio/mpeg': 'MP3',
      'audio/mp3': 'MP3',
      'audio/webm': 'WEBM_OPUS',
    }

    return mapping[mimeType.toLowerCase()] || 'LINEAR16'
  }

  /**
   * Classify user intent
   */
  private async classifyIntent(message: string): Promise<IntentClassification> {
    try {
      logger.debug('[ThinkAgent] [classifyIntent] Classifying intent for message:', message)
      const prompt = INTENT_CLASSIFICATION_PROMPT.replace('{message}', message)

      const { data } = await generateJSON<IntentClassification>(prompt, {
        model: 'flash',
      })

      logger.debug('[ThinkAgent] [classifyIntent] Classification result:', data)
      return data
    } catch (error) {
      logger.error('[ThinkAgent] [classifyIntent] Error classifying intent:', error)
      // Default to inquiry if classification fails
      const fallback: IntentClassification = {
        intent: 'inquiry',
        confidence: 0.5,
      }
      logger.debug('[ThinkAgent] [classifyIntent] Using fallback:', fallback)
      return fallback
    }
  }

  /**
   * Handle inquiry (data question) - READ ONLY with reflection loop
   */
  private async handleInquiry(
    message: string,
    suggestedSql?: string,
    showSql?: boolean,
    includeMetadata?: boolean
  ): Promise<AgentResponse> {
    try {
      // Use reflection-based SQL generation with retry loop
      const reflection = new SQLReflection(this.context, this.client, {
        maxRetries: 3,
        enableCritic: true,
        includeSchema: true,
      })

      logger.debug('[ThinkAgent] Generating SQL with reflection loop for message:', message)
      const reflectionResult = await reflection.generateAndExecute(message, suggestedSql)
      
      if (!reflectionResult.success) {
        logger.error('[ThinkAgent] Reflection loop failed after all attempts')
        return {
          text: `I encountered an error while retrieving the data: ${reflectionResult.finalError || 'Failed to generate valid SQL after multiple attempts'}. Could you please rephrase your question?`,
          error: reflectionResult.finalError || 'SQL generation failed',
          ...(showSql && { sqlQuery: reflectionResult.query }),
        }
      }

      const sqlQuery = reflectionResult.query
      logger.debug('[ThinkAgent] Generated SQL (after reflection):', sqlQuery)
      logger.debug('[ThinkAgent] SQL explanation:', reflectionResult.explanation)
      logger.debug('[ThinkAgent] Attempts made:', reflectionResult.attempts.length)

      // Validate that SQL is read-only (SELECT only)
      const normalizedQuery = sqlQuery.trim().toUpperCase()
      if (!normalizedQuery.startsWith('SELECT')) {
        logger.error('[ThinkAgent] Non-SELECT query detected:', sqlQuery)
        return {
          text: 'I can only execute SELECT queries to retrieve information. I cannot create, update, or delete data. Please switch to Agent Mode for such operations.',
          error: 'Non-SELECT query not allowed in Think Mode',
        }
      }

      // Execute SQL query (should succeed since reflection loop validated it)
      logger.debug('[ThinkAgent] Executing validated SQL query...')
      const result = await SqlExecutor.execute({
        query: sqlQuery,
        context: this.context,
        client: this.client,
      })
      logger.debug('[ThinkAgent] SQL execution result:', { rowCount: result.rowCount, hasError: !!result.error })

      if (result.error) {
        // This shouldn't happen if reflection worked, but handle it anyway
        return {
          text: `I encountered an error while retrieving the data: ${result.error}. Could you please rephrase your question?`,
          error: result.error,
          ...(showSql && { sqlQuery }),
        }
      }

      // Format response using AI with original question and raw data
      let responseText: string
      try {
        logger.debug('[ThinkAgent] Formatting results with AI...')
        responseText = await SqlExecutor.formatResult(result, message)
        logger.debug('[ThinkAgent] AI formatting complete, response length:', responseText.length)
      } catch (error) {
        // Fallback if AI formatting fails
        logger.error('[ThinkAgent] AI formatting error, using code fallback:', error)
        responseText = await SqlExecutor.formatResult(result)
      }

      // Add SQL query if requested
      const toolCalls: ToolCall[] | undefined = includeMetadata
        ? [
            {
              tool: 'execute_sql',
              parameters: { 
                query: sqlQuery,
                attempts: reflectionResult.attempts.length,
                reflectionUsed: true,
              },
              result: result.data,
            },
          ]
        : undefined

      // Return both formatted text (for explanation) AND raw JSON (for charts/tables)
      return {
        text: responseText, // AI-formatted explanation
        rawData: result.data, // Raw JSON for frontend to build charts/tables
        rowCount: result.rowCount,
        toolCalls,
        ...(showSql && { sqlQuery }),
      }
    } catch (error) {
      logger.error('[ThinkAgent] [handleInquiry] ERROR:', error)
      logger.error('[ThinkAgent] [handleInquiry] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return {
        text: `I encountered an error while processing your query: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question.`,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Handle general conversation
   */
  private async handleConversation(message: string): Promise<AgentResponse> {
    try {
      logger.debug('[ThinkAgent] [handleConversation] Processing conversation message')
      const model = getGeminiFlash()
      
      const prompt = `You are a helpful AI assistant in "Think Mode" - a read-only mode that can only view and retrieve information from the database.

Your capabilities:
- Answer questions about existing data (users, organizations, classes, etc.)
- Provide information and statistics
- Help users understand the system

Your limitations:
- You CANNOT create, update, or delete anything
- You CANNOT perform actions like creating users, organizations, or classes
- If a user asks for such operations, politely explain that they need to switch to "Agent Mode"

User message: "${message}"

Provide a helpful, concise response. If the user is asking to perform an action, remind them that Think Mode is read-only and they should switch to Agent Mode.`

      const response = await model.generateContent(prompt)
      const text = response.response.text()

      return {
        text,
      }
    } catch (error) {
      logger.error('[ThinkAgent] [handleConversation] ERROR:', error)
      return {
        text: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

}

/**
 * Create a new Think Agent instance (read-only mode)
 */
export function createThinkAgent(options: AgentOptions): ThinkAgent {
  return new ThinkAgent(options)
}
