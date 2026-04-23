import type {
  AgentOptions,
  AgentResponse,
  ProcessOptions,
  UserContext,
  IntentClassification,
  ToolCall,
  ProgressInfo,
  ProgressItem,
} from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { SqlExecutor } from '../executor/sql'
import {
  createUser,
  createClass,
  createStudent,
  createTeacher,
  createOrganization,
} from '../tools'
import { InputValidator } from '../security/validator'
import { getGeminiFlash, generateJSON } from '@eduator/ai/gemini'
import { transcribeAudio, type STTOptions } from '@eduator/ai/stt-generator'
import {
  SYSTEM_PROMPT,
  INTENT_CLASSIFICATION_PROMPT,
} from '../prompts'
import { SQLReflection } from './reflection'
import { logger } from '../logger'

/**
 * Main Agent class
 */
export class Agent {
  private context: UserContext
  private client: SupabaseClient
  // private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [] // Future use

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
   */
  async process(options: ProcessOptions): Promise<AgentResponse> {
    const { message, audio, audioMimeType, audioLanguageCode, includeMetadata, showSql, conversationId } = options
    // conversationId is reserved for future conversation context

    logger.debug('[Agent] ========================================')
    logger.debug('[Agent] Processing new request')
    logger.debug('[Agent] Has text message:', !!message)
    logger.debug('[Agent] Has audio input:', !!audio)
    logger.debug('[Agent] User ID:', this.context.userId)
    logger.debug('[Agent] Profile Type:', this.context.profileType)
    logger.debug('[Agent] Organization ID:', this.context.organizationId)
    logger.debug('[Agent] Options:', { showSql, includeMetadata, conversationId })

    try {
      // If audio is provided, transcribe it first
      let processedMessage = message || ''
      
      if (audio) {
        logger.debug('[Agent] Transcribing audio input...')
        try {
          const sttOptions: STTOptions = {
            languageCode: audioLanguageCode,
            encoding: audioMimeType ? this.mimeTypeToEncoding(audioMimeType) : undefined,
            enableAutomaticPunctuation: true,
          }
          
          const transcription = await transcribeAudio(audio, sttOptions)
          processedMessage = transcription.text
          
          logger.debug('[Agent] Audio transcription complete:', {
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
          logger.error('[Agent] Audio transcription error:', error)
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

      logger.debug('[Agent] Processed message:', processedMessage)

      // Detect language
      const language = this.detectLanguage(processedMessage)
      logger.debug('[Agent] Detected language:', language)

      // Classify user intent
      logger.debug('[Agent] Classifying intent...')
      const intent = await this.classifyIntent(processedMessage)
      logger.debug('[Agent] Intent classification result:', {
        intent: intent.intent,
        tools: intent.tools,
        confidence: intent.confidence,
      })

      // Handle based on intent
      if (intent.intent === 'action' && intent.tools && intent.tools.length > 0) {
        logger.debug('[Agent] Routing to action handler')
        
        // Build initial progress list to show immediately
        const initialProgressSteps = this.buildProgressList(intent)
        const initialProgress: ProgressInfo = {
          steps: initialProgressSteps,
          currentStep: 0,
          totalSteps: initialProgressSteps.length,
          inProgress: true,
        }
        
        // Execute the action (this will update progress as it goes)
        const response = await this.handleAction(intent, processedMessage, includeMetadata)
        
        // Ensure progress is included in response (use final progress if available, otherwise initial)
        const finalResponse: AgentResponse = {
          ...response,
          progress: response.progress || initialProgress,
        }
        
        logger.debug('[Agent] Action response:', { 
          textLength: finalResponse.text?.length, 
          hasError: !!finalResponse.error,
          toolCallsCount: finalResponse.toolCalls?.length,
          progressSteps: finalResponse.progress?.steps.length
        })
        logger.debug('[Agent] ========================================')
        return finalResponse
      } else if (intent.intent === 'inquiry') {
        logger.debug('[Agent] Routing to inquiry handler')
        const response = await this.handleInquiry(processedMessage, intent.suggestedSql, showSql, includeMetadata)
        logger.debug('[Agent] Inquiry response:', { 
          textLength: response.text?.length, 
          hasError: !!response.error,
          rowCount: response.rowCount 
        })
        logger.debug('[Agent] ========================================')
        return response
      } else {
        logger.debug('[Agent] Routing to conversation handler')
        const response = await this.handleConversation(processedMessage)
        logger.debug('[Agent] Conversation response:', { 
          textLength: response.text?.length, 
          hasError: !!response.error 
        })
        logger.debug('[Agent] ========================================')
        return response
      }
    } catch (error) {
      logger.error('[Agent] ========================================')
      logger.error('[Agent] FATAL ERROR in process()')
      logger.error('[Agent] Error:', error)
      logger.error('[Agent] Error message:', error instanceof Error ? error.message : 'Unknown error')
      logger.error('[Agent] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      logger.error('[Agent] Input that caused error:', { message, hasAudio: !!audio })
      logger.error('[Agent] ========================================')
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
      logger.debug('[Agent] [classifyIntent] Classifying intent for message:', message)
      const prompt = INTENT_CLASSIFICATION_PROMPT.replace('{message}', message)

      const { data } = await generateJSON<IntentClassification>(prompt, {
        model: 'flash',
      })

      logger.debug('[Agent] [classifyIntent] Classification result:', data)
      return data
    } catch (error) {
      logger.error('[Agent] [classifyIntent] Error classifying intent:', error)
      // Default to inquiry if classification fails
      const fallback: IntentClassification = {
        intent: 'inquiry',
        confidence: 0.5,
      }
      logger.debug('[Agent] [classifyIntent] Using fallback:', fallback)
      return fallback
    }
  }

  /**
   * Handle inquiry (data question) with enhanced reflection loop
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

      logger.debug('[Agent] Generating SQL with reflection loop for message:', message)
      const reflectionResult = await reflection.generateAndExecute(message, suggestedSql)
      
      if (!reflectionResult.success) {
        logger.error('[Agent] Reflection loop failed after all attempts')
        return {
          text: `I encountered an error while retrieving the data: ${reflectionResult.finalError || 'Failed to generate valid SQL after multiple attempts'}. Could you please rephrase your question?`,
          error: reflectionResult.finalError || 'SQL generation failed',
          ...(showSql && { sqlQuery: reflectionResult.query }),
        }
      }

      const sqlQuery = reflectionResult.query
      logger.debug('[Agent] Generated SQL (after reflection):', sqlQuery)
      logger.debug('[Agent] SQL explanation:', reflectionResult.explanation)
      logger.debug('[Agent] Attempts made:', reflectionResult.attempts.length)

      // Execute SQL query (should succeed since reflection loop validated it)
      logger.debug('[Agent] Executing validated SQL query...')
      const result = await SqlExecutor.execute({
        query: sqlQuery,
        context: this.context,
        client: this.client,
      })
      logger.debug('[Agent] SQL execution result:', { rowCount: result.rowCount, hasError: !!result.error })

      if (result.error) {
        // This shouldn't happen if reflection worked, but handle it anyway
        return {
          text: `I encountered an error while retrieving the data: ${result.error}. Could you please rephrase your question?`,
          error: result.error,
          ...(showSql && { sqlQuery }),
        }
      }

      // LLM Call 2 (Summarizer): Format response using AI with original question and raw data
      let responseText: string
      try {
        logger.debug('[Agent] Formatting results with AI...')
        // Send original question + raw JSON data to AI for intelligent formatting
        responseText = await SqlExecutor.formatResult(result, message)
        logger.debug('[Agent] AI formatting complete, response length:', responseText.length)
      } catch (error) {
        // Fallback if AI formatting fails
        logger.error('[Agent] AI formatting error, using code fallback:', error)
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
                reflectionSuccess: reflectionResult.success,
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
      logger.error('[Agent] [handleInquiry] ERROR:', error)
      logger.error('[Agent] [handleInquiry] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return {
        text: `I encountered an error while processing your query: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question.`,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Build progress list from intent tools
   */
  private buildProgressList(intent: IntentClassification): ProgressItem[] {
    const steps: ProgressItem[] = []
    const tools = intent.tools || []

    // Tool descriptions mapping
    const toolDescriptions: Record<string, string> = {
      create_organization: 'Create organization',
      create_user: 'Create user',
      create_class: 'Create class',
      create_student: 'Create student',
      create_teacher: 'Create teacher',
      enroll_student: 'Enroll student in class',
    }

    // Process tools in order (organization first, then users, then others)
    const orderedTools: string[] = []
    
    // Add create_organization first if present
    if (tools.includes('create_organization')) {
      orderedTools.push('create_organization')
    }
    
    // Add create_user if present
    if (tools.includes('create_user')) {
      orderedTools.push('create_user')
    }
    
    // Add other tools
    tools.forEach(tool => {
      if (!orderedTools.includes(tool)) {
        orderedTools.push(tool)
      }
    })

    // Build progress items
    orderedTools.forEach(tool => {
      steps.push({
        tool,
        description: toolDescriptions[tool] || tool,
        status: 'pending',
      })
    })

    return steps
  }

  /**
   * Handle action request
   */
  private async handleAction(
    intent: IntentClassification,
    message: string,
    includeMetadata?: boolean
  ): Promise<AgentResponse> {
    const toolCalls: ToolCall[] = []
    
    // Build progress list
    const progressSteps = this.buildProgressList(intent)
    let currentStepIndex = 0

    try {
      logger.debug('[Agent] [handleAction] Starting action handling')
      logger.debug('[Agent] [handleAction] Available tools:', intent.tools)
      logger.debug('[Agent] [handleAction] Progress steps:', progressSteps.map(s => s.tool))
      
      // Initialize first step as executing if we have steps
      if (progressSteps.length > 0) {
        progressSteps[0].status = 'executing'
      }
      
      // Helper to update progress step
      const updateStep = (stepIndex: number, status: ProgressItem['status'], error?: string) => {
        if (progressSteps[stepIndex]) {
          progressSteps[stepIndex].status = status
          if (error) {
            progressSteps[stepIndex].error = error
          }
        }
      }
      
      // Helper to get current progress
      const getProgress = (): ProgressInfo => {
        return {
          steps: [...progressSteps],
          currentStep: currentStepIndex,
          totalSteps: progressSteps.length,
          inProgress: progressSteps.some(s => s.status === 'pending' || s.status === 'executing'),
        }
      }
      
      // Parse action parameters from message
      // For now, we'll use AI to extract parameters
      // In production, you might want a more structured approach

      if (intent.tools?.includes('create_class')) {
        logger.debug('[Agent] [handleAction] Processing create_class')
        logger.debug('[Agent] [create_class] Extracting parameters...')
        const params = await this.extractCreateClassParams(message)
        logger.debug('[Agent] [create_class] Extracted params:', params)
        logger.debug('[Agent] [create_class] Calling createClass tool...')
        const result = await createClass(params, this.context, this.client)
        logger.debug('[Agent] [create_class] Result:', { success: result.success, error: result.error })

        toolCalls.push({
          tool: 'create_class',
          parameters: params,
          result: result.data,
          error: result.error,
        })

        if (!result.success) {
          logger.error('[Agent] [create_class] Failed:', result.error)
          return {
            text: `I couldn't create the class: ${result.error}. Please check your input and try again.`,
            error: result.error,
            toolCalls: includeMetadata ? toolCalls : undefined,
          }
        }
        
        logger.debug('[Agent] [create_class] Success:', result.data)

        return {
          text: `✅ Successfully created class "${(result.data as any).name}" with code "${(result.data as any).classCode}".`,
          toolCalls: includeMetadata ? toolCalls : undefined,
        }
      }

      if (intent.tools?.includes('create_student')) {
        logger.debug('[Agent] [handleAction] Processing create_student')
        const requestedCount = this.extractRequestedCount(message)
        const isTestRequest = this.isTestDataRequest(message)
        const preferredDomain = this.extractPreferredEmailDomain(message)

        // Bulk "test" creation: e.g. "create 5 test students"
        if (requestedCount > 1 && isTestRequest) {
          logger.debug('[Agent] [create_student] Bulk test creation detected:', { requestedCount })
          const batch = await this.buildTestStudentsBatch(message, requestedCount)

          const successes: Array<{ fullName: string; email: string }> = []
          const failures: Array<{ fullName: string; email: string; error: string }> = []

          for (const params of batch) {
            logger.debug('[Agent] [create_student] Calling createStudent tool (bulk)...')
            const result = await createStudent(params, this.context, this.client)
            logger.debug('[Agent] [create_student] Result (bulk):', { success: result.success, error: result.error })

            toolCalls.push({
              tool: 'create_student',
              parameters: { ...params, password: '***' },
              result: result.data,
              error: result.error,
            })

            if (result.success) {
              successes.push({ fullName: params.fullName, email: params.email })
            } else {
              failures.push({
                fullName: params.fullName,
                email: params.email,
                error: result.error || 'Unknown error',
              })
            }
          }

          let text = `✅ Created ${successes.length}/${requestedCount} test student profiles.`
          if (successes.length > 0) {
            text += `\n\n**Created:**\n` + successes.map((s) => `- ${s.fullName} (${s.email})`).join('\n')
          }
          if (failures.length > 0) {
            text += `\n\n⚠️ **Failed:**\n` + failures.map((f) => `- ${f.fullName} (${f.email}): ${f.error}`).join('\n')
          }

          return {
            text,
            toolCalls: includeMetadata ? toolCalls : undefined,
          }
        }

        logger.debug('[Agent] [create_student] Extracting parameters...')
        const { students } = await this.extractCreateStudentParams(message)
        logger.debug('[Agent] [create_student] Extracted students:', students.map((s) => ({ ...s, password: '***' })))

        const studentSuccesses: Array<{ fullName: string; email: string }> = []
        const studentFailures: Array<{ fullName: string; email: string; error: string }> = []

        for (const student of students) {
          const params = { ...student }

          // Last-mile sanitization / fallback for email
          params.email = this.normalizeEmail(params.email)
          if (!InputValidator.isValidEmail(params.email)) {
            params.email = this.generateDemoEmailFromName(params.fullName, 'student', preferredDomain)
          }

          logger.debug('[Agent] [create_student] Calling createStudent tool (explicit)...')
          const result = await createStudent(params, this.context, this.client)
          logger.debug('[Agent] [create_student] Result (explicit):', {
            success: result.success,
            error: result.error,
          })

          toolCalls.push({
            tool: 'create_student',
            parameters: { ...params, password: '***' },
            result: result.data,
            error: result.error,
          })

          if (result.success) {
            studentSuccesses.push({ fullName: params.fullName, email: params.email })
          } else {
            studentFailures.push({
              fullName: params.fullName,
              email: params.email,
              error: result.error || 'Unknown error',
            })
          }
        }

        if (students.length === 1) {
          const s = studentSuccesses[0]
          if (!s) {
            const f = studentFailures[0]
            return {
              text: `I couldn't create the student: ${f?.error || 'Unknown error'}. Please check your input and try again.`,
              error: f?.error || 'Unknown error',
              toolCalls: includeMetadata ? toolCalls : undefined,
            }
          }

          return {
            text: `✅ Successfully created student "${s.fullName}" (${s.email}).${
              students[0].classId ? ' Student enrolled in class.' : ''
            }`,
            toolCalls: includeMetadata ? toolCalls : undefined,
          }
        }

        let textStudents = `✅ Created ${studentSuccesses.length}/${students.length} student profiles.`
        if (studentSuccesses.length > 0) {
          textStudents +=
            `\n\n**Created:**\n` +
            studentSuccesses.map((s) => `- ${s.fullName} (${s.email})`).join('\n')
        }
        if (studentFailures.length > 0) {
          textStudents +=
            `\n\n⚠️ **Failed:**\n` +
            studentFailures.map((f) => `- ${f.fullName} (${f.email}): ${f.error}`).join('\n')
        }

        return {
          text: textStudents,
          toolCalls: includeMetadata ? toolCalls : undefined,
        }
      }

      if (intent.tools?.includes('create_teacher')) {
        logger.debug('[Agent] [handleAction] Processing create_teacher')
        const requestedCount = this.extractRequestedCount(message)
        const isTestRequest = this.isTestDataRequest(message)
        const preferredDomain = this.extractPreferredEmailDomain(message)

        // Bulk "test" creation: e.g. "create 5 test teachers"
        if (requestedCount > 1 && isTestRequest) {
          logger.debug('[Agent] [create_teacher] Bulk test creation detected:', { requestedCount })
          const batch = await this.buildTestTeachersBatch(message, requestedCount)

          const successes: Array<{ fullName: string; email: string }> = []
          const failures: Array<{ fullName: string; email: string; error: string }> = []

          for (const params of batch) {
            logger.debug('[Agent] [create_teacher] Calling createTeacher tool (bulk)...')
            const result = await createTeacher(params, this.context, this.client)
            logger.debug('[Agent] [create_teacher] Result (bulk):', { success: result.success, error: result.error })

            toolCalls.push({
              tool: 'create_teacher',
              parameters: { ...params, password: '***' },
              result: result.data,
              error: result.error,
            })

            if (result.success) {
              successes.push({ fullName: params.fullName, email: params.email })
            } else {
              failures.push({
                fullName: params.fullName,
                email: params.email,
                error: result.error || 'Unknown error',
              })
            }
          }

          let text = `✅ Created ${successes.length}/${requestedCount} test teacher profiles.`
          if (successes.length > 0) {
            text += `\n\n**Created:**\n` + successes.map((s) => `- ${s.fullName} (${s.email})`).join('\n')
          }
          if (failures.length > 0) {
            text += `\n\n⚠️ **Failed:**\n` + failures.map((f) => `- ${f.fullName} (${f.email}): ${f.error}`).join('\n')
          }

          return {
            text,
            toolCalls: includeMetadata ? toolCalls : undefined,
          }
        }

        logger.debug('[Agent] [create_teacher] Extracting parameters...')
        const { teachers } = await this.extractCreateTeacherParams(message)
        logger.debug('[Agent] [create_teacher] Extracted teachers:', teachers.map((t) => ({ ...t, password: '***' })))

        const successes: Array<{ fullName: string; email: string }> = []
        const failures: Array<{ fullName: string; email: string; error: string }> = []

        for (const teacher of teachers) {
          const params = { ...teacher }

          // Last-mile sanitization / fallback for email
          params.email = this.normalizeEmail(params.email)
          if (!InputValidator.isValidEmail(params.email)) {
            params.email = this.generateDemoEmailFromName(params.fullName, 'teacher', preferredDomain)
          }

          logger.debug('[Agent] [create_teacher] Calling createTeacher tool (explicit)...')
          const result = await createTeacher(params, this.context, this.client)
          logger.debug('[Agent] [create_teacher] Result (explicit):', {
            success: result.success,
            error: result.error,
          })

          toolCalls.push({
            tool: 'create_teacher',
            parameters: { ...params, password: '***' },
            result: result.data,
            error: result.error,
          })

          if (result.success) {
            successes.push({ fullName: params.fullName, email: params.email })
          } else {
            failures.push({
              fullName: params.fullName,
              email: params.email,
              error: result.error || 'Unknown error',
            })
          }
        }

        if (teachers.length === 1) {
          const t = successes[0]
          if (!t) {
            const f = failures[0]
            return {
              text: `I couldn't create the teacher: ${f?.error || 'Unknown error'}. Please check your input and try again.`,
              error: f?.error || 'Unknown error',
              toolCalls: includeMetadata ? toolCalls : undefined,
            }
          }

          return {
            text: `✅ Successfully created teacher "${t.fullName}" (${t.email}).`,
            toolCalls: includeMetadata ? toolCalls : undefined,
          }
        }

        let text = `✅ Created ${successes.length}/${teachers.length} teacher profiles.`
        if (successes.length > 0) {
          text += `\n\n**Created:**\n` + successes.map((s) => `- ${s.fullName} (${s.email})`).join('\n')
        }
        if (failures.length > 0) {
          text += `\n\n⚠️ **Failed:**\n` + failures.map((f) => `- ${f.fullName} (${f.email}): ${f.error}`).join('\n')
        }

        return {
          text,
          toolCalls: includeMetadata ? toolCalls : undefined,
        }
      }

      // IMPORTANT: Process create_organization FIRST if present, as other tools may depend on it
      if (intent.tools?.includes('create_organization')) {
        const stepIndex = progressSteps.findIndex(s => s.tool === 'create_organization')
        if (stepIndex >= 0) {
          currentStepIndex = stepIndex
          updateStep(stepIndex, 'executing')
        }
        
        logger.debug('[Agent] [handleAction] Processing create_organization')
        
        // Detect if user provided minimal info (e.g., "create some organization", "create organization")
        const isMinimalRequest = /create\s+(some|a|an|new)?\s*organization/i.test(message) && 
                                 !/called|named|name\s+is|name:\s*[A-Za-z]|organization\s+[A-Z]/.test(message)
        
        logger.debug('[Agent] [create_organization] Is minimal request:', isMinimalRequest)
        logger.debug('[Agent] [create_organization] Extracting parameters...')
        
        // Extract organization params
        const orgPrompt = `Extract parameters for creating an organization from this message: "${message}"

    Return JSON:
    {
      "name": "string (optional if user says 'some organization' or doesn't specify - will use default)",
      "type": "string (optional) - 'school' | 'university' | 'institution' | 'academy' | 'other' (default: 'school')",
      "email": "string (optional - will default if not provided)",
      "subscriptionPlan": "string (optional) - 'basic' | 'premium' | 'enterprise' (default: 'basic')",
      "createDemoUsers": "boolean (optional) - If true, creates demo admin, teacher, and 3 students (default: false unless user mentions 'demo')"
    }

    Important:
    - If user says "create some organization", "create organization", "create an organization" WITHOUT a specific name, set name to null (will use default)
    - If user says "create organization called X", "create organization named X", "create X organization", extract X as the name
    - If user mentions "demo", set createDemoUsers to true
    - Only extract specific details if user explicitly provides them
    - If user is vague (e.g., "some organization"), don't try to extract a name - return null for name`

        const { data: orgParams } = await generateJSON<any>(orgPrompt, { model: 'flash' })
        logger.debug('[Agent] [create_organization] Extracted params:', orgParams)
        
        // If minimal request and no name extracted, use default name
        if (isMinimalRequest && (!orgParams || !orgParams.name || orgParams.name.trim().length === 0)) {
          const timestamp = Date.now().toString().slice(-8)
          orgParams.name = `Organization ${timestamp}`
          logger.debug('[Agent] [create_organization] Using default name:', orgParams.name)
        }
        
        // Ensure name exists
        if (!orgParams || !orgParams.name || orgParams.name.trim().length === 0) {
          const timestamp = Date.now().toString().slice(-8)
          orgParams.name = orgParams.name || `Organization ${timestamp}`
          logger.debug('[Agent] [create_organization] Generated name:', orgParams.name)
        }
        
        // Default createDemoUsers based on message
        if (!orgParams.createDemoUsers) {
          orgParams.createDemoUsers = /demo/i.test(message)
        }
        
        logger.debug('[Agent] [create_organization] Final params:', orgParams)
        logger.debug('[Agent] [create_organization] Calling createOrganization tool...')
        const result = await createOrganization(orgParams, this.context, this.client)
        logger.debug('[Agent] [create_organization] Result:', { success: result.success, error: result.error })

        toolCalls.push({
          tool: 'create_organization',
          parameters: orgParams,
          result: result.data,
          error: result.error,
        })

        if (!result.success) {
          logger.error('[Agent] [create_organization] Failed:', result.error)
          if (stepIndex >= 0) {
            updateStep(stepIndex, 'failed', result.error)
          }
          return {
            text: `I couldn't create the organization: ${result.error}. Please check your input and try again.`,
            error: result.error,
            toolCalls: includeMetadata ? toolCalls : undefined,
            progress: getProgress(),
          }
        }
        
        if (stepIndex >= 0) {
          updateStep(stepIndex, 'completed')
        }
        logger.debug('[Agent] [create_organization] Success:', result.data)

        const orgData = result.data as any
        let responseText = `✅ Successfully created organization "${orgData.organization.name}" (${orgData.organization.slug}).\n\n`
        responseText += `**Organization Details:**\n`
        responseText += `- Name: ${orgData.organization.name}\n`
        responseText += `- Type: ${orgData.organization.type}\n`
        responseText += `- Email: ${orgData.organization.email}\n`
        responseText += `- Subscription: ${orgData.organization.subscription_plan}\n`

        if (orgData.demoUsers && orgData.demoUsers.length > 0) {
          responseText += `\n**Demo Users Created:**\n`
          orgData.demoUsers.forEach((user: any) => {
            responseText += `- ${user.type}: ${user.name} (${user.email})\n`
          })
        }

        // Check if user also wants to create a school admin for this organization
        // Look for keywords like "assign", "create admin", "school admin", "assign user", etc.
        const wantsAdmin = intent.tools?.includes('create_user') || 
                          /assign.*(admin|user)|create.*(admin|user)|school.*admin|admin.*assign|assign.*to|create.*and.*assign/i.test(message)
        
        logger.debug('[Agent] [create_organization] Checking if user wants admin:', {
          hasCreateUserTool: intent.tools?.includes('create_user'),
          messageMatches: /assign.*(admin|user)|create.*(admin|user)|school.*admin|admin.*assign|assign.*to|create.*and.*assign/i.test(message),
          wantsAdmin,
          hasOrgId: !!orgData.organization?.id
        })
        
        if (wantsAdmin && orgData.organization?.id) {
          logger.debug('[Agent] [create_organization] User wants admin, proceeding with user creation...')
          // Detect if user provided minimal info (e.g., "assign some user", "create some admin")
          const isMinimalUserRequest = /assign\s+(some|a|an)?\s*(user|admin)|create\s+(some|a|an)?\s*(user|admin)/i.test(message) &&
                                       !/[A-Z][a-z]+\s+[A-Z][a-z]+|named\s+[A-Z]|called\s+[A-Z]|email|@/.test(message)
          
          // Extract user creation params, but override organizationId with the newly created org
          const userPrompt = `Extract parameters for creating a user/admin from this message: "${message}"

    Return JSON:
    {
      "email": "string (optional - will be generated if not provided)",
      "password": "string (optional - will be generated if not provided)",
      "fullName": "string (optional - will be generated if not provided)",
      "profileType": "'teacher' | 'student' | 'school_superadmin' (optional - will default to 'school_superadmin' if not specified)"
    }

    Important:
    - If user says "assign some user", "create some admin", "assign user" WITHOUT specific details, return null/empty for email and fullName (will use defaults)
    - If user says "school admin", "admin", or "assign admin", set profileType to 'school_superadmin'
    - If user says "teacher", set profileType to 'teacher'
    - If user says "student", set profileType to 'student'
    - If user provides specific name (e.g., "assign John Doe"), extract it as fullName
    - If user provides email, extract it
    - Only extract details if user explicitly provides them - if vague, return null/empty for optional fields`

          logger.debug('[Agent] [create_organization] Creating admin/user for organization')
          logger.debug('[Agent] [create_organization] Is minimal user request:', isMinimalUserRequest)
          logger.debug('[Agent] [create_organization] Extracting user parameters...')
          
          let { data: userParams } = await generateJSON<any>(userPrompt, { model: 'flash' })
          logger.debug('[Agent] [create_organization] Initial user params from AI:', userParams)
          
          // Initialize userParams if AI didn't return anything
          if (!userParams) {
            userParams = {}
            logger.debug('[Agent] [create_organization] Initialized empty userParams')
          }
          
          // If minimal request, ensure we don't have invalid extracted values
          if (isMinimalUserRequest) {
            logger.debug('[Agent] [create_organization] Cleaning minimal request params...')
            // Clear any extracted values that might be invalid
            if (!userParams.email || userParams.email === 'null' || userParams.email === 'undefined') {
              userParams.email = undefined
            }
            if (!userParams.fullName || userParams.fullName === 'null' || userParams.fullName === 'undefined' || userParams.fullName.trim().length === 0) {
              userParams.fullName = undefined
            }
          }
          
          // Set organization ID from the newly created organization (CRITICAL - MUST be set)
          userParams.organizationId = orgData.organization.id
          logger.debug('[Agent] [create_organization] Set organizationId:', userParams.organizationId)
          
          logger.debug('[Agent] [create_organization] After extraction, userParams:', { 
            email: userParams.email, 
            fullName: userParams.fullName, 
            profileType: userParams.profileType,
            organizationId: userParams.organizationId 
          })
          
          // Detect profile type from message if not explicitly set
          if (!userParams.profileType) {
            if (/school.*admin|admin/i.test(message) && !/teacher|student/i.test(message)) {
              userParams.profileType = 'school_superadmin'
            } else if (/teacher/i.test(message)) {
              userParams.profileType = 'teacher'
            } else if (/student/i.test(message)) {
              userParams.profileType = 'student'
            } else {
              // Default to school_superadmin if creating with organization
              userParams.profileType = 'school_superadmin'
            }
          }
          
          // Generate password if not provided
          if (!userParams.password) {
            userParams.password = this.generateSecurePassword()
          }
          
          // Generate email if not provided or invalid format
          // Sanitize organization slug for email domain
          let slug = orgData.organization.slug
            ? orgData.organization.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 50)
            : orgData.organization.name
              ? orgData.organization.name.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 50)
              : 'org'
          
          // Ensure slug is not empty and is valid
          if (!slug || slug.length === 0) {
            slug = 'org'
          }
          
          // Remove any leading/trailing hyphens and ensure it's not empty
          slug = slug.replace(/^-+|-+$/g, '')
          if (!slug || slug.length === 0) {
            slug = 'org'
          }
          
          // Generate email based on profile type
          if (!userParams.email || !userParams.email.includes('@')) {
            // Create a valid email based on organization slug
            if (userParams.profileType === 'school_superadmin') {
              userParams.email = `admin@${slug}.edu`
            } else if (userParams.profileType === 'teacher') {
              userParams.email = `teacher@${slug}.edu`
            } else {
              userParams.email = `user@${slug}.edu`
            }
          }
          
          // Ensure email is valid format (fix common issues)
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
          if (!emailRegex.test(userParams.email)) {
            // Force regenerate with valid format - use a simple fallback
            const cleanSlug = slug.replace(/[^a-z0-9]/g, '').substring(0, 30) || 'org'
            if (userParams.profileType === 'school_superadmin') {
              userParams.email = `admin@${cleanSlug}.edu`
            } else if (userParams.profileType === 'teacher') {
              userParams.email = `teacher@${cleanSlug}.edu`
            } else {
              userParams.email = `user@${cleanSlug}.edu`
            }
          }
          
          // Trim and clean email - ensure it's lowercase and valid
          userParams.email = userParams.email.trim().toLowerCase()
          
          // Final validation - if still invalid, use timestamp-based email
          if (!emailRegex.test(userParams.email)) {
            const timestamp = Date.now().toString().slice(-6)
            const cleanSlug = slug.replace(/[^a-z0-9]/g, '').substring(0, 20) || 'org'
            userParams.email = `admin${timestamp}@${cleanSlug}.edu`
          }
          
          logger.debug('[Agent] Final userParams before createUser:', { 
            email: userParams.email, 
            fullName: userParams.fullName, 
            profileType: userParams.profileType,
            organizationId: userParams.organizationId,
            hasPassword: !!userParams.password
          })
          
          // Generate name if not provided
          if (!userParams.fullName || userParams.fullName.trim().length === 0) {
            if (userParams.profileType === 'school_superadmin') {
              userParams.fullName = `${orgData.organization.name} Admin`
            } else if (userParams.profileType === 'teacher') {
              userParams.fullName = `${orgData.organization.name} Teacher`
            } else {
              userParams.fullName = `${orgData.organization.name} User`
            }
          }

          // Final validation before creating user
          logger.debug('[Agent] [create_organization] Validating email before user creation...')
          if (!InputValidator.isValidEmail(userParams.email)) {
            console.warn('[Agent] [create_organization] Email invalid, regenerating...')
            // Last resort: generate a completely safe email
            const safeSlug = slug.replace(/[^a-z0-9]/g, '').substring(0, 20) || 'org'
            const timestamp = Date.now().toString().slice(-6)
            userParams.email = `admin${timestamp}@${safeSlug}.edu`
            logger.debug('[Agent] [create_organization] Generated new email:', userParams.email)
            
            // If still invalid, use a generic fallback
            if (!InputValidator.isValidEmail(userParams.email)) {
              userParams.email = `admin${timestamp}@example.edu`
              logger.debug('[Agent] [create_organization] Using fallback email:', userParams.email)
            }
          }
          
          // Ensure all required fields are present
          logger.debug('[Agent] [create_organization] Checking required fields...')
          if (!userParams.email || !userParams.password || !userParams.fullName || !userParams.profileType) {
            logger.error('[Agent] [create_organization] Missing required fields:', {
              hasEmail: !!userParams.email,
              hasPassword: !!userParams.password,
              hasFullName: !!userParams.fullName,
              hasProfileType: !!userParams.profileType
            })
            return {
              text: `✅ Successfully created organization "${orgData.organization.name}" (${orgData.organization.slug}).\n\n⚠️ However, I couldn't create the school admin due to missing required information. Please create the admin manually.`,
              toolCalls: includeMetadata ? toolCalls : undefined,
            }
          }

          logger.debug('[Agent] [create_organization] Final user params before createUser:', { 
            email: userParams.email,
            fullName: userParams.fullName,
            profileType: userParams.profileType,
            organizationId: userParams.organizationId,
            hasPassword: !!userParams.password,
            emailValid: InputValidator.isValidEmail(userParams.email)
          })

          // Update progress for create_user step
          const userStepIndex = progressSteps.findIndex(s => s.tool === 'create_user')
          if (userStepIndex >= 0) {
            currentStepIndex = userStepIndex
            updateStep(userStepIndex, 'executing')
          }
          
          logger.debug('[Agent] [create_organization] Calling createUser tool...')
          const userResult = await createUser(userParams, this.context, this.client)
          logger.debug('[Agent] [create_organization] createUser result:', { success: userResult.success, error: userResult.error })
          
          if (userStepIndex >= 0) {
            if (userResult.success) {
              updateStep(userStepIndex, 'completed')
            } else {
              updateStep(userStepIndex, 'failed', userResult.error)
            }
          }

          toolCalls.push({
            tool: 'create_user',
            parameters: { ...userParams, password: '***' }, // Don't expose password
            result: userResult.data,
            error: userResult.error,
          })

          if (userResult.success) {
            responseText += `\n**${userParams.profileType === 'school_superadmin' ? 'School Admin' : userParams.profileType.charAt(0).toUpperCase() + userParams.profileType.slice(1)} Created:**\n`
            responseText += `- Name: ${userParams.fullName}\n`
            responseText += `- Email: ${userParams.email}\n`
            responseText += `- Assigned to: ${orgData.organization.name}\n`
            responseText += `- Profile Type: ${userParams.profileType}\n`
          } else {
            responseText += `\n⚠️ Note: Organization created successfully, but I couldn't create the ${userParams.profileType}: ${userResult.error}`
            responseText += `\n\n**Attempted Parameters:**\n`
            responseText += `- Email: ${userParams.email}\n`
            responseText += `- Name: ${userParams.fullName}\n`
            responseText += `- Organization ID: ${userParams.organizationId}\n`
            responseText += `- Profile Type: ${userParams.profileType}\n`
          }
        }

        return {
          text: responseText,
          toolCalls: includeMetadata ? toolCalls : undefined,
          progress: getProgress(),
        }
      }

      // Process create_user ONLY if create_organization was NOT processed (standalone user creation)
      if (intent.tools?.includes('create_user')) {
        const stepIndex = progressSteps.findIndex(s => s.tool === 'create_user')
        if (stepIndex >= 0) {
          currentStepIndex = stepIndex
          updateStep(stepIndex, 'executing')
        }
        
        logger.debug('[Agent] [handleAction] Processing create_user (standalone)')
        logger.debug('[Agent] [create_user] Extracting parameters...')
        const params = await this.extractCreateUserParams(message)
        logger.debug('[Agent] [create_user] Extracted params:', { ...params, password: '***' })
        logger.debug('[Agent] [create_user] Calling createUser tool...')
        const result = await createUser(params, this.context, this.client)
        logger.debug('[Agent] [create_user] Result:', { success: result.success, error: result.error })

        toolCalls.push({
          tool: 'create_user',
          parameters: params,
          result: result.data,
          error: result.error,
        })

        if (!result.success) {
          if (stepIndex >= 0) {
            updateStep(stepIndex, 'failed', result.error)
          }
          return {
            text: `I couldn't create the user: ${result.error}. Please check your input and try again.`,
            error: result.error,
            toolCalls: includeMetadata ? toolCalls : undefined,
            progress: getProgress(),
          }
        }

        if (stepIndex >= 0) {
          updateStep(stepIndex, 'completed')
        }

        return {
          text: `✅ Successfully created ${params.profileType} "${params.fullName}" (${params.email}).`,
          toolCalls: includeMetadata ? toolCalls : undefined,
          progress: getProgress(),
        }
      }

      return {
        text: "I understand you want to perform an action, but I couldn't determine the specific action or parameters. Could you please provide more details?",
      }
    } catch (error) {
      logger.error('[Agent] [handleAction] ERROR:', error)
      logger.error('[Agent] [handleAction] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return {
        text: `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolCalls: includeMetadata ? toolCalls : undefined,
      }
    }
  }

  /**
   * Handle general conversation
   */
  private async handleConversation(message: string): Promise<AgentResponse> {
    // Use AI to generate a helpful response
    const model = getGeminiFlash()
    const prompt = `${SYSTEM_PROMPT}\n\nUser: ${message}\n\nAssistant:`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      return {
        text,
      }
    } catch (error) {
      return {
        text: `I apologize, but I'm having trouble understanding your request. Could you please rephrase it?`,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Detect language from user message
   */
  private detectLanguage(message: string): string {
    // Simple language detection based on character patterns
    // Check for Cyrillic (Russian, Ukrainian, etc.)
    if (/[\u0400-\u04FF]/.test(message)) {
      return 'ru'
    }
    
    // Check for Chinese characters
    if (/[\u4E00-\u9FFF]/.test(message)) {
      return 'zh'
    }
    
    // Check for Arabic
    if (/[\u0600-\u06FF]/.test(message)) {
      return 'ar'
    }
    
    // Check for Azerbaijani/Turkish specific characters
    if (/[əışğüöç]/.test(message.toLowerCase())) {
      return 'az'
    }
    
    // Check for common Azerbaijani/Turkish words
    const azTrWords = ['necə', 'nə', 'kim', 'harada', 'niyə', 'ne', 'nasıl', 'kim', 'göstər', 'sayı', 'hansı']
    if (azTrWords.some(word => message.toLowerCase().includes(word))) {
      return 'az'
    }
    
    // Default to English
    return 'en'
  }

  // Note: generateSQL method removed - now using SQLReflection class for enhanced error handling and retry logic

  /**
   * Extract parameters for create class action
   */
  private async extractCreateClassParams(message: string): Promise<any> {
    logger.debug('[Agent] [extractCreateClassParams] Extracting parameters from:', message)
    // Use AI to extract parameters from natural language
    const prompt = `Extract parameters for creating a class from this message: "${message}"

    Return JSON with these fields (null if not specified):
    {
      "name": "string (required)",
      "description": "string | null",
      "subject": "string | null",
      "gradeLevel": "string | null",
      "academicYear": "string | null",
      "semester": "string | null",
      "teacherId": "string (UUID) | null - if teacher name provided, you need to find their ID",
      "organizationId": "string (UUID) | null"
    }`

    const { data } = await generateJSON<any>(prompt, { model: 'flash' })
    logger.debug('[Agent] [extractCreateClassParams] Extracted params:', data)

    // If teacher name provided, find teacher ID
    if (data.teacherName && !data.teacherId) {
      // Search for teacher by name
      const { data: teachers } = await this.client
        .from('profiles')
        .select('id')
        .eq('profile_type', 'teacher')
        .ilike('full_name', `%${data.teacherName}%`)
        .limit(1)

      if (teachers && teachers.length > 0) {
        data.teacherId = teachers[0].id
      }
    }

    // Set organization ID from context if not provided
    if (!data.organizationId && this.context.organizationId) {
      data.organizationId = this.context.organizationId
    }

    return data
  }


  /**
   * Extract parameters for create student action
   */
  private async extractCreateStudentParams(
    message: string
  ): Promise<{ students: any[] }> {
    logger.debug('[Agent] [extractCreateStudentParams] Extracting parameters from:', message)
    const isMinimalRequest =
      /(create|add|make)\s+(test\s+)?\d*\s*(students?|student)\b/i.test(message) &&
      !/email\s*[:=]|@/.test(message)

    const preferredDomain = this.extractPreferredEmailDomain(message)

    const prompt = `Extract parameters for creating a student from this message: "${message}"

    Return JSON:
    {
      "email": "string (optional - if missing or invalid, leave null/empty)",
      "password": "string (required - generate a secure password if not provided)",
      "fullName": "string (optional - if missing, leave null/empty)",
      "organizationId": "string (UUID) | null",
      "classId": "string (UUID) | null"
    }

    IMPORTANT:
    - If the user clearly mentions multiple students (e.g. "first", "second", "student 1", "student 2", or lists multiple name/email pairs),
      you may return an ARRAY of student objects instead of a single object.
    - If you return an array, each item MUST have the same shape as the single-student object above.
    - If details are missing for some students, leave those fields null/empty; the backend will fill safe defaults.`

    const { data } = await generateJSON<any>(prompt, { model: 'flash' })

    const students: any[] = []

    if (Array.isArray(data)) {
      students.push(...data)
    } else if (data && typeof data === 'object') {
      const numericKeys = Object.keys(data).filter((k) => /^\d+$/.test(k))
      if (numericKeys.length > 0) {
        numericKeys
          .sort((a, b) => Number(a) - Number(b))
          .forEach((k) => {
            if (data[k] && typeof data[k] === 'object') {
              students.push(data[k])
            }
          })
      }

      const maybeSingle = {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        organizationId: data.organizationId,
        classId: data.classId,
      }
      const hasSingleValues = Object.values(maybeSingle).some(
        (v) => v !== null && v !== undefined && v !== ''
      )
      if (hasSingleValues || students.length === 0) {
        students.push(maybeSingle)
      }
    }

    const normalizedStudents = students.map((raw) => {
      const s: any = { ...raw }

      // Generate password if not provided
      if (!s.password) {
        s.password = this.generateSecurePassword()
      }

      // If minimal request, ensure we don't keep bogus extracted values
      if (isMinimalRequest) {
        if (!s.email || s.email === 'null' || s.email === 'undefined') s.email = undefined
        if (!s.fullName || s.fullName === 'null' || s.fullName === 'undefined') s.fullName = undefined
      }

      // Defaults for missing info
      if (!s.fullName || (typeof s.fullName === 'string' && s.fullName.trim().length === 0)) {
        s.fullName = this.generateDemoFullName('student')
      }

      s.email = this.normalizeEmail(s.email)
      if (!InputValidator.isValidEmail(s.email)) {
        s.email = this.generateDemoEmailFromName(s.fullName, 'student', preferredDomain)
      }

      // Set organization ID from context if not provided
      if (!s.organizationId && this.context.organizationId) {
        s.organizationId = this.context.organizationId
      }

      return s
    })

    return { students: normalizedStudents }
  }

  /**
   * Extract parameters for create teacher action
   */
  private async extractCreateTeacherParams(
    message: string
  ): Promise<{ teachers: any[] }> {
    logger.debug('[Agent] [extractCreateTeacherParams] Extracting parameters from:', message)
    const isMinimalRequest =
      /(create|add|make)\s+(test\s+)?\d*\s*(teachers?|teacher)\b/i.test(message) &&
      !/email\s*[:=]|@/.test(message)

    const preferredDomain = this.extractPreferredEmailDomain(message)

    const prompt = `Extract parameters for creating a teacher from this message: "${message}"

    Return JSON:
    {
      "email": "string (optional - if missing or invalid, leave null/empty)",
      "password": "string (required - generate if not provided)",
      "fullName": "string (optional - if missing, leave null/empty)",
      "organizationId": "string (UUID) | null",
      "department": "string | null",
      "bio": "string | null"
    }

    IMPORTANT:
    - If the user clearly mentions multiple teachers (e.g. "first", "second", "teacher 1", "teacher 2", or lists multiple name/email pairs),
      you may return an ARRAY of teacher objects instead of a single object.
    - If you return an array, each item MUST have the same shape as the single-teacher object above.
    - If details are missing for some teachers, leave those fields null/empty; the backend will fill safe defaults.`

    const { data } = await generateJSON<any>(prompt, { model: 'flash' })

    const teachers: any[] = []

    if (Array.isArray(data)) {
      teachers.push(...data)
    } else if (data && typeof data === 'object') {
      const numericKeys = Object.keys(data).filter((k) => /^\d+$/.test(k))
      if (numericKeys.length > 0) {
        numericKeys
          .sort((a, b) => Number(a) - Number(b))
          .forEach((k) => {
            if (data[k] && typeof data[k] === 'object') {
              teachers.push(data[k])
            }
          })
      }

      const maybeSingle = {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        organizationId: data.organizationId,
        department: data.department,
        bio: data.bio,
      }
      const hasSingleValues = Object.values(maybeSingle).some(
        (v) => v !== null && v !== undefined && v !== ''
      )
      if (hasSingleValues || teachers.length === 0) {
        teachers.push(maybeSingle)
      }
    }

    const normalizedTeachers = teachers.map((raw) => {
      const t: any = { ...raw }

      // Generate password if not provided
      if (!t.password) {
        t.password = this.generateSecurePassword()
      }

      // If minimal request, ensure we don't keep bogus extracted values
      if (isMinimalRequest) {
        if (!t.email || t.email === 'null' || t.email === 'undefined') t.email = undefined
        if (!t.fullName || t.fullName === 'null' || t.fullName === 'undefined') t.fullName = undefined
      }

      // Defaults for missing info
      if (!t.fullName || (typeof t.fullName === 'string' && t.fullName.trim().length === 0)) {
        t.fullName = this.generateDemoFullName('teacher')
      }

      t.email = this.normalizeEmail(t.email)
      if (!InputValidator.isValidEmail(t.email)) {
        t.email = this.generateDemoEmailFromName(t.fullName, 'teacher', preferredDomain)
      }

      // Set organization ID from context if not provided
      if (!t.organizationId && this.context.organizationId) {
        t.organizationId = this.context.organizationId
      }

      return t
    })

    return { teachers: normalizedTeachers }
  }

  /**
   * Extract parameters for create user action
   */
  private async extractCreateUserParams(message: string, organizationId?: string): Promise<any> {
    // Detect if user provided minimal info
    const isMinimalRequest = /create\s+(some|a|an)?\s*(user|admin|teacher|student)/i.test(message) &&
                             !/[A-Z][a-z]+\s+[A-Z][a-z]+|named\s+[A-Z]|called\s+[A-Z]|email\s*[:=]|@/.test(message)
    
    const prompt = `Extract parameters for creating a user from this message: "${message}"

    Return JSON:
    {
      "email": "string (optional if user says 'some user' or doesn't specify - will be generated)",
      "password": "string (optional - will be generated if not provided)",
      "fullName": "string (optional if user says 'some user' or doesn't specify - will be generated)",
      "profileType": "'teacher' | 'student' | 'school_superadmin' (optional - will default based on context)",
      "organizationId": "string (UUID) | null (optional - will use provided organizationId if available)"
    }

    Important:
    - If user says "create some user", "create user", "create an admin" WITHOUT specific details, return null/empty for email and fullName (will use defaults)
    - If user says "school admin" or "admin", set profileType to 'school_superadmin'
    - If user says "teacher", set profileType to 'teacher'
    - If user says "student", set profileType to 'student'
    - If user provides specific name (e.g., "create user John Doe"), extract it as fullName
    - If user provides email, extract it
    - Only extract details if user explicitly provides them - if vague, return null/empty for optional fields`

    const { data } = await generateJSON<any>(prompt, { model: 'flash' })
    logger.debug('[Agent] [extractCreateUserParams] Initial extracted params:', { ...data, password: '***' })
    
    // If minimal request, ensure we use defaults
    if (isMinimalRequest) {
      logger.debug('[Agent] [extractCreateUserParams] Processing minimal request, cleaning params...')
      if (!data.email || data.email === 'null' || data.email === 'undefined') {
        data.email = undefined
      }
      if (!data.fullName || data.fullName === 'null' || data.fullName === 'undefined' || (data.fullName && data.fullName.trim().length === 0)) {
        data.fullName = undefined
      }
    }

    // Generate password if not provided
    if (!data.password) {
      data.password = this.generateSecurePassword()
    }

    // Use provided organizationId or set from context
    if (organizationId) {
      data.organizationId = organizationId
      logger.debug('[Agent] [extractCreateUserParams] Using provided organizationId:', organizationId)
    } else if (!data.organizationId && this.context.organizationId) {
      data.organizationId = this.context.organizationId
      logger.debug('[Agent] [extractCreateUserParams] Using context organizationId:', this.context.organizationId)
    }
    
    logger.debug('[Agent] [extractCreateUserParams] Final params:', { ...data, password: '***' })

    // Detect profile type from message if not explicitly set
    if (!data.profileType) {
      if (/school.*admin|admin/i.test(message) && !/teacher|student/i.test(message)) {
        data.profileType = 'school_superadmin'
      } else if (/teacher/i.test(message)) {
        data.profileType = 'teacher'
      } else if (/student/i.test(message)) {
        data.profileType = 'student'
      }
    }

    return data
  }

  /**
   * Generate a secure random password
   */
  private generateSecurePassword(): string {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  /**
   * Generate a realistic-looking demo full name
   */
  private generateDemoFullName(type: 'teacher' | 'student' | 'admin' | 'user'): string {
    const firstNames = [
      'Aylin',
      'Emil',
      'Leyla',
      'Murad',
      'Sara',
      'Kamran',
      'Nigar',
      'Altan',
      'Elvin',
      'Selin',
    ]
    const lastNames = [
      'Huseynov',
      'Aliyev',
      'Mammadova',
      'Rahimov',
      'Ismayilova',
      'Karimov',
      'Suleymanov',
      'Guliyeva',
      'Qurbanov',
      'Nasibova',
    ]

    const first = firstNames[Math.floor(Math.random() * firstNames.length)]
    const last = lastNames[Math.floor(Math.random() * lastNames.length)]

    // Slight hint in name for role, but still natural
    if (type === 'teacher') {
      return `${first} ${last}`
    }
    if (type === 'student') {
      return `${first} ${last}`
    }
    return `${first} ${last}`
  }

  /**
   * Generate a professional-looking demo email based on full name
   */
  private generateDemoEmailFromName(
    fullName: string,
    prefix: 'teacher' | 'student' | 'admin' | 'user',
    domainOverride?: string | null
  ): string {
    const cleaned = (fullName || prefix)
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
    const first = cleaned[0] || prefix
    const last = cleaned[cleaned.length - 1] || prefix

    let localPart = `${first}.${last}`.toLowerCase().replace(/[^a-z0-9.]/g, '')
    if (!localPart || localPart === '.') {
      localPart = prefix
    }

    const suffix = Math.random().toString(36).slice(2, 5)
    // Use preferred domain if provided, otherwise a stable demo domain
    let domain =
      (domainOverride || '')
        .replace(/^@/, '')
        .toLowerCase()
        .trim() || 'demo.eduator.school'

    // Basic safety: ensure domain has at least one dot
    if (!domain.includes('.')) {
      domain = 'demo.eduator.school'
    }

    return `${localPart}${suffix}@${domain}`
  }

  private normalizeEmail(email: unknown): string {
    if (typeof email !== 'string') return ''
    // Trim and remove common accidental whitespace around '@' and '.'
    return email.trim().replace(/\s+/g, '').toLowerCase()
  }

  private isTestDataRequest(message: string): boolean {
    return /\b(test|demo|sample|dummy)\b/i.test(message)
  }

  private extractRequestedCount(message: string): number {
    const m = message.match(/\b(\d{1,3})\b/)
    if (m?.[1]) {
      const n = Number(m[1])
      if (Number.isFinite(n) && n > 0) return n
    }

    const normalized = message.toLowerCase()
    const map: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      // Azerbaijani
      bir: 1,
      iki: 2,
      üç: 3,
      uc: 3,
      dörd: 4,
      dord: 4,
      beş: 5,
      bes: 5,
      altı: 6,
      alti: 6,
      yeddi: 7,
      səkkiz: 8,
      sekkiz: 8,
      doqquz: 9,
      on: 10,
    }

    for (const [word, n] of Object.entries(map)) {
      if (new RegExp(`\\b${word}\\b`, 'i').test(normalized)) return n
    }
    return 1
  }

  /**
   * Extract a preferred email domain from the user's message, if they mention one
   * Examples: "@bdu.az", "bdu.az"
   */
  private extractPreferredEmailDomain(message: string): string | null {
    const text = message.toLowerCase()

    // 1) Look for explicit @domain.tld pattern
    const atMatch = text.match(/@([a-z0-9.-]+\.[a-z]{2,})/i)
    if (atMatch?.[1]) {
      return atMatch[1]
    }

    // 2) Fallback: bare domain like "bdu.az"
    const bareMatch = text.match(/\b([a-z0-9.-]+\.[a-z]{2,})\b/i)
    if (bareMatch?.[1]) {
      return bareMatch[1]
    }

    return null
  }

  private async buildTestTeachersBatch(message: string, count: number): Promise<any[]> {
    // Try to extract org/department/bio if provided; then clone for batch.
    const { teachers } = await this.extractCreateTeacherParams(message)
    const base = teachers[0] || {}
    const preferredDomain = this.extractPreferredEmailDomain(message)
    const batch: any[] = []
    for (let i = 1; i <= count; i++) {
      const fullName = this.generateDemoFullName('teacher')
      batch.push({
        ...base,
        fullName,
        email: this.generateDemoEmailFromName(fullName, 'teacher', preferredDomain),
        password: this.generateSecurePassword(),
      })
    }
    return batch
  }

  private async buildTestStudentsBatch(message: string, count: number): Promise<any[]> {
    // Try to extract org/classId if provided; then clone for batch.
    const { students } = await this.extractCreateStudentParams(message)
    const base = students[0] || {}
    const preferredDomain = this.extractPreferredEmailDomain(message)
    const batch: any[] = []
    for (let i = 1; i <= count; i++) {
      const fullName = this.generateDemoFullName('student')
      batch.push({
        ...base,
        fullName,
        email: this.generateDemoEmailFromName(fullName, 'student', preferredDomain),
        password: this.generateSecurePassword(),
      })
    }
    return batch
  }
}

/**
 * Create a new agent instance
 */
export function createAgent(options: AgentOptions): Agent {
  return new Agent(options)
}
