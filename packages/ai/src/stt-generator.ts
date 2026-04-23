/**
 * STT (Speech-to-Text) Generator
 * Supports both server-side (Google Cloud Speech-to-Text) and client-side (Web Speech API) transcription.
 *
 * NOTE: For the Gemini fallback we now use the central AI_MODELS config
 * so model names stay in sync with the rest of the app.
 */
import { AI_MODELS } from '@eduator/config'

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.GOOGLE_GEMINI_API_KEY
const GOOGLE_CLOUD_SPEECH_API_KEY = process.env.GOOGLE_CLOUD_SPEECH_API_KEY || GEMINI_API_KEY

/**
 * STT options for transcription
 */
export interface STTOptions {
  /** Language code (e.g., 'en-US', 'az-AZ', 'ru-RU'). If not provided, will auto-detect */
  languageCode?: string
  /** Sample rate in Hz (e.g., 16000, 44100). Default: 16000 */
  sampleRateHertz?: number
  /** Audio encoding format. Default: 'LINEAR16' for WAV */
  encoding?: 'LINEAR16' | 'FLAC' | 'OGG_OPUS' | 'MP3' | 'WEBM_OPUS'
  /** Number of audio channels. Default: 1 (mono) */
  audioChannelCount?: number
  /** Enable automatic punctuation. Default: true */
  enableAutomaticPunctuation?: boolean
  /** Enable word-level timestamps. Default: false */
  enableWordTimeOffsets?: boolean
}

/**
 * STT transcription result
 */
export interface STTResult {
  /** Transcribed text */
  text: string
  /** Confidence score (0-1) */
  confidence?: number
  /** Detected language code */
  languageCode?: string
  /** Alternative transcriptions if available */
  alternatives?: Array<{
    text: string
    confidence?: number
  }>
}

/**
 * Transcribe audio using Google Cloud Speech-to-Text API
 * @param audioData - Audio data as Buffer, base64 string, or File
 * @param options - STT configuration options
 * @returns Transcribed text and metadata
 */
export async function transcribeAudio(
  audioData: Buffer | string | ArrayBuffer,
  options: STTOptions = {}
): Promise<STTResult> {
  if (!GOOGLE_CLOUD_SPEECH_API_KEY) {
    throw new Error('Google Cloud Speech API key is required. Set GOOGLE_CLOUD_SPEECH_API_KEY or GOOGLE_GEMINI_API_KEY environment variable.')
  }

  try {
    // Normalize audio data to base64 string
    let audioBase64: string
    let audioFormat = options.encoding || 'LINEAR16'
    let sampleRate = options.sampleRateHertz || 16000

    if (Buffer.isBuffer(audioData)) {
      audioBase64 = audioData.toString('base64')
    } else if (typeof audioData === 'string') {
      // If it's already base64, use it; otherwise, assume it's a data URL
      if (audioData.startsWith('data:')) {
        const base64Match = audioData.match(/data:audio\/\w+;base64,(.+)/)
        if (base64Match) {
          audioBase64 = base64Match[1]
          // Try to detect format from data URL
          const formatMatch = audioData.match(/data:audio\/(\w+);/)
          if (formatMatch) {
            const mimeType = formatMatch[1].toLowerCase()
            audioFormat = mimeTypeToEncoding(mimeType)
          }
        } else {
          throw new Error('Invalid audio data URL format')
        }
      } else {
        audioBase64 = audioData
      }
    } else if (audioData instanceof ArrayBuffer) {
      audioBase64 = Buffer.from(audioData).toString('base64')
    } else {
      throw new Error('Unsupported audio data format')
    }

    console.log(`[STT] Transcribing audio, format: ${audioFormat}, sample rate: ${sampleRate}Hz, language: ${options.languageCode || 'auto-detect'}`)

    // Prepare request body for Google Cloud Speech-to-Text API
    const requestBody: any = {
      config: {
        encoding: audioFormat,
        sampleRateHertz: sampleRate,
        languageCode: options.languageCode || 'auto',
        enableAutomaticPunctuation: options.enableAutomaticPunctuation !== false,
        enableWordTimeOffsets: options.enableWordTimeOffsets || false,
        audioChannelCount: options.audioChannelCount || 1,
        alternativeLanguageCodes: [], // Can add fallback languages here
      },
      audio: {
        content: audioBase64,
      },
    }

    // Use Google Cloud Speech-to-Text API v1
    // Note: This requires Google Cloud Speech-to-Text API to be enabled
    // Alternative: Use a different endpoint or service if available
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_SPEECH_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[STT] API error:', response.status, errorText)
      
      // Fallback: Try using Gemini's audio understanding if available
      if (response.status === 403 || response.status === 404) {
        console.log('[STT] Falling back to Gemini audio understanding...')
        return await transcribeWithGemini(audioBase64, options)
      }
      
      throw new Error(`Speech-to-Text API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // Parse response
    if (!data.results || data.results.length === 0) {
      return {
        text: '',
        confidence: 0,
        languageCode: options.languageCode,
      }
    }

    const firstResult = data.results[0]
    const alternative = firstResult.alternatives?.[0]

    if (!alternative || !alternative.transcript) {
      return {
        text: '',
        confidence: 0,
        languageCode: data.languageCode || options.languageCode,
      }
    }

    const result: STTResult = {
      text: alternative.transcript,
      confidence: alternative.confidence || undefined,
      languageCode: data.languageCode || options.languageCode,
    }

    // Include alternatives if available
    if (firstResult.alternatives && firstResult.alternatives.length > 1) {
      result.alternatives = firstResult.alternatives.slice(1).map((alt: any) => ({
        text: alt.transcript,
        confidence: alt.confidence,
      }))
    }

    console.log(`[STT] Transcription complete: "${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}" (confidence: ${result.confidence?.toFixed(2) || 'N/A'})`)
    return result
  } catch (error) {
    console.error('[STT] Transcription error:', error)
    throw error
  }
}

/**
 * Fallback: Use Gemini's audio understanding capability
 * Note: This requires Gemini 2.0 Flash or later with audio support
 */
async function transcribeWithGemini(
  audioBase64: string,
  options: STTOptions
): Promise<STTResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is required for audio transcription')
  }

  try {
    console.log('[STT] Using Gemini for audio transcription...')

    // Use Gemini's multimodal capabilities to transcribe audio
    // Note: This is a simplified approach - actual implementation may vary based on Gemini API
    // Use the central TEXT model (multimodal, supports audio + text) from AI_MODELS
    const modelName = AI_MODELS.TEXT

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/wav', // Adjust based on actual format
                  data: audioBase64,
                },
              },
              {
                text: 'Please transcribe this audio. Return only the transcribed text without any additional commentary.',
              },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    return {
      text: text.trim(),
      languageCode: options.languageCode,
    }
  } catch (error) {
    console.error('[STT] Gemini transcription error:', error)
    throw error
  }
}

/**
 * Convert MIME type to Google Cloud Speech encoding format
 */
function mimeTypeToEncoding(mimeType: string): 'LINEAR16' | 'FLAC' | 'OGG_OPUS' | 'MP3' | 'WEBM_OPUS' {
  const mapping: Record<string, 'LINEAR16' | 'FLAC' | 'OGG_OPUS' | 'MP3' | 'WEBM_OPUS'> = {
    'wav': 'LINEAR16',
    'x-wav': 'LINEAR16',
    'wave': 'LINEAR16',
    'flac': 'FLAC',
    'ogg': 'OGG_OPUS',
    'opus': 'OGG_OPUS',
    'mp3': 'MP3',
    'mpeg': 'MP3',
    'webm': 'WEBM_OPUS',
  }

  return mapping[mimeType.toLowerCase()] || 'LINEAR16'
}

/**
 * Transcribe audio from a file path or URL
 * @param audioSource - File path, URL, or Supabase storage path
 * @param options - STT configuration options
 * @returns Transcribed text and metadata
 */
export async function transcribeAudioFromSource(
  audioSource: string,
  options: STTOptions = {}
): Promise<STTResult> {
  try {
    // Check if it's a URL or file path
    let audioData: Buffer

    if (audioSource.startsWith('http://') || audioSource.startsWith('https://')) {
      // Fetch from URL
      const response = await fetch(audioSource)
      if (!response.ok) {
        throw new Error(`Failed to fetch audio from URL: ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      audioData = Buffer.from(arrayBuffer)
    } else if (audioSource.startsWith('gs://') || audioSource.includes('/storage/')) {
      // Supabase storage path - would need to fetch from Supabase
      throw new Error('Supabase storage paths require Supabase client. Use transcribeAudio() with fetched audio data instead.')
    } else {
      // Assume local file path (Node.js only)
      const fs = await import('fs/promises')
      audioData = await fs.readFile(audioSource)
    }

    return await transcribeAudio(audioData, options)
  } catch (error) {
    console.error('[STT] Error transcribing from source:', error)
    throw error
  }
}

/**
 * Client-side STT using Web Speech API (browser only)
 * This is a free alternative that doesn't require API keys
 * @param audioBlob - Audio blob from MediaRecorder or File
 * @param options - STT options (languageCode supported)
 * @returns Transcribed text
 */
export async function transcribeAudioClientSide(
  audioBlob: Blob,
  options: STTOptions = {}
): Promise<STTResult> {
  // Check if running in browser
  if (typeof window === 'undefined') {
    throw new Error('transcribeAudioClientSide() can only be used in the browser')
  }

  return new Promise((resolve, reject) => {
    // Check if Web Speech API is available
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      reject(new Error('Web Speech API is not supported in this browser'))
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = options.languageCode || 'en-US'

    // Convert blob to audio URL and play it
    // Note: Web Speech API requires live audio input, so this approach has limitations
    // For recorded audio, you'll need to use the server-side API
    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      resolve({
        text: transcript,
        languageCode: options.languageCode || 'en-US',
      })
    }

    recognition.onerror = (event: any) => {
      reject(new Error(`Speech recognition error: ${event.error}`))
    }

    // Start recognition and play audio
    recognition.start()
    audio.play().catch((error) => {
      console.error('[STT] Error playing audio:', error)
      // Still try to use recognition if available
    })
  })
}
