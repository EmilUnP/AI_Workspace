'use server'

import { createClient } from '@eduator/auth/supabase/server'
import { createAgent, createThinkAgent, type AgentResponse } from '@eduator/agent'
import { transcribeAudio } from '@eduator/ai/stt-generator'
import type { STTOptions } from '@eduator/ai/stt-generator'

/**
 * Transcribe audio to text only (without processing through agent)
 * Used for previewing transcribed text before sending
 */
export async function transcribeAudioOnly(
  audio: string | ArrayBuffer | Buffer,
  options?: {
    audioMimeType?: string
    audioLanguageCode?: string
  }
): Promise<{ text: string; error?: string }> {
  try {
    const sttOptions: STTOptions = {
      languageCode: options?.audioLanguageCode,
      enableAutomaticPunctuation: true,
    }

    // Handle MIME type to encoding conversion
    if (options?.audioMimeType) {
      const mimeType = options.audioMimeType.toLowerCase()
      const encodingMap: Record<string, STTOptions['encoding']> = {
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
      sttOptions.encoding = encodingMap[mimeType]
    }

    const result = await transcribeAudio(audio, sttOptions)
    
    return {
      text: result.text,
    }
  } catch (error) {
    return {
      text: '',
      error: error instanceof Error ? error.message : 'Transcription failed',
    }
  }
}

/**
 * Process a message through the AI agent (Full CRUD mode)
 * Supports both text and audio input
 */
export async function processAgentMessage(
  message?: string,
  options?: {
    audio?: string | ArrayBuffer
    audioMimeType?: string
    audioLanguageCode?: string
    showSql?: boolean
    includeMetadata?: boolean
  }
): Promise<AgentResponse> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      text: 'Authentication required. Please log in.',
      error: 'Unauthorized',
    }
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, profile_type, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return {
      text: 'Profile not found. Please contact support.',
      error: 'Profile not found',
    }
  }

  // Only allow platform owners and school admins
  if (!['platform_owner', 'school_superadmin'].includes(profile.profile_type)) {
    return {
      text: 'AI Agent is only available for Platform Owners and School Administrators.',
      error: 'Access denied',
    }
  }

  // Create agent instance (full CRUD mode)
  const agent = createAgent({
    userId: user.id,
    profileType: profile.profile_type as 'platform_owner' | 'school_superadmin',
    organizationId: profile.organization_id,
  })

  // Process message (supports both text and audio)
  try {
    // Convert ArrayBuffer to Buffer if needed (for server-side processing)
    let audioData: Buffer | string | ArrayBuffer | undefined = options?.audio
    
    if (options?.audio instanceof ArrayBuffer) {
      // Convert ArrayBuffer to Buffer for server-side processing
      audioData = Buffer.from(options.audio)
    }

    const response = await agent.process({
      message,
      audio: audioData,
      audioMimeType: options?.audioMimeType,
      audioLanguageCode: options?.audioLanguageCode,
      showSql: options?.showSql,
      includeMetadata: options?.includeMetadata,
    })

    return response
  } catch (error) {
    return {
      text: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Process a message through the Think Agent (Read-only mode)
 * Only supports viewing and retrieving information
 * Cannot create, update, or delete data
 */
export async function processThinkMessage(
  message?: string,
  options?: {
    audio?: string | ArrayBuffer
    audioMimeType?: string
    audioLanguageCode?: string
    showSql?: boolean
    includeMetadata?: boolean
  }
): Promise<AgentResponse> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      text: 'Authentication required. Please log in.',
      error: 'Unauthorized',
    }
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, profile_type, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile) {
    return {
      text: 'Profile not found. Please contact support.',
      error: 'Profile not found',
    }
  }

  // Only allow platform owners and school admins
  if (!['platform_owner', 'school_superadmin'].includes(profile.profile_type)) {
    return {
      text: 'AI Agent is only available for Platform Owners and School Administrators.',
      error: 'Access denied',
    }
  }

  // Create Think Agent instance (read-only mode)
  const thinkAgent = createThinkAgent({
    userId: user.id,
    profileType: profile.profile_type as 'platform_owner' | 'school_superadmin',
    organizationId: profile.organization_id,
  })

  // Process message (supports both text and audio)
  try {
    // Convert ArrayBuffer to Buffer if needed (for server-side processing)
    let audioData: Buffer | string | ArrayBuffer | undefined = options?.audio
    
    if (options?.audio instanceof ArrayBuffer) {
      // Convert ArrayBuffer to Buffer for server-side processing
      audioData = Buffer.from(options.audio)
    }

    const response = await thinkAgent.process({
      message,
      audio: audioData,
      audioMimeType: options?.audioMimeType,
      audioLanguageCode: options?.audioLanguageCode,
      showSql: options?.showSql,
      includeMetadata: options?.includeMetadata,
    })

    return response
  } catch (error) {
    return {
      text: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
