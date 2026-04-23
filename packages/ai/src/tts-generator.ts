/**
 * TTS Audio Generator for Lessons
 * Uses Gemini TTS for generating lesson audio narration
 */

import { createAdminClient } from '@eduator/auth/supabase/admin'
import { AI_MODELS } from '@eduator/config'

const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.GOOGLE_GEMINI_API_KEY

/**
 * Generate TTS audio for a lesson
 * @param lessonId - The lesson ID (used for storage path)
 * @param title - The lesson title
 * @param content - The lesson content (markdown will be stripped)
 * @param language - Optional language hint for pronunciation
 * @returns The public URL of the generated audio, or null if generation failed
 */
export async function generateLessonAudio(
  lessonId: string,
  title: string,
  content: string,
  language?: string
): Promise<string | null> {
  const result = await generateLessonAudioWithUsage(lessonId, title, content, language)
  return result.audioUrl
}

export async function generateLessonAudioWithUsage(
  lessonId: string,
  title: string,
  content: string,
  language?: string
): Promise<{
  audioUrl: string | null
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}> {
  if (!GEMINI_API_KEY) {
    console.warn("TTS: No API key configured, skipping audio generation")
    return { audioUrl: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }
  }

  try {
    // Prepare text: title + content (strip markdown)
    const plainText = `${title}. ${content}`
      .replace(/#{1,6}\s/g, "") // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
      .replace(/\*([^*]+)\*/g, "$1") // Remove italic
      .replace(/`([^`]+)`/g, "$1") // Remove code
      .replace(/```[\s\S]*?```/g, "") // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // Remove images
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/\n{3,}/g, "\n\n") // Normalize line breaks
      .trim()
      .substring(0, 8000) // Limit length for API

    if (plainText.length < 50) {
      console.log("TTS: Content too short, skipping audio generation")
      return { audioUrl: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }
    }

    console.log(`TTS: Generating audio for lesson ${lessonId}, text length: ${plainText.length}, language: ${language || "auto-detect"}`)

    // The TTS API automatically detects language from text, but we can add language hints if needed
    const requestBody = {
      contents: [{ parts: [{ text: plainText }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" }
          }
        }
      }
    }

    // Add language hint if provided (helps with pronunciation for non-English languages)
    if (language && language !== "English") {
      // Note: Gemini TTS automatically detects language from text content
      // The text is already in the target language, so TTS will use appropriate pronunciation
      console.log(`TTS: Using language ${language} for audio generation`)
    }

    const maxRetries = 2
    const retryDelayMs = 2000
    let data: { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }> } | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.TTS}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }
      )

      if (response.ok) {
        data = await response.json()
        break
      }

      const errorText = await response.text()
      console.error(`TTS API error (lesson ${lessonId}) attempt ${attempt + 1}/${maxRetries + 1}:`, response.status, errorText)

      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)))
        continue
      }
      return { audioUrl: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }
    }

    if (!data) {
      return { audioUrl: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }
    }

    const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data

    if (!audioBase64) {
      console.error("TTS: No audio data in response")
      return { audioUrl: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }
    }

    // Convert base64 PCM to WAV
    const pcmBuffer = Buffer.from(audioBase64, "base64")
    const wavBuffer = createWavBuffer(pcmBuffer)

    // Upload to Supabase storage
    const supabase = createAdminClient()
    const fileName = `lessons/${lessonId}/audio.wav`

    const { error: uploadError } = await supabase.storage
      .from("lesson-audio")
      .upload(fileName, wavBuffer, {
        contentType: "audio/wav",
        upsert: true
      })

    if (uploadError) {
      console.error("TTS: Failed to upload audio:", uploadError)
      return { audioUrl: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("lesson-audio")
      .getPublicUrl(fileName)

    console.log(`TTS: Audio saved for lesson ${lessonId}:`, urlData.publicUrl)
    return {
      audioUrl: urlData.publicUrl,
      usage: {
        prompt_tokens: (data as { usageMetadata?: { promptTokenCount?: number } })?.usageMetadata?.promptTokenCount ?? 0,
        completion_tokens:
          (data as { usageMetadata?: { candidatesTokenCount?: number } })?.usageMetadata?.candidatesTokenCount ?? 0,
        total_tokens:
          (data as { usageMetadata?: { totalTokenCount?: number } })?.usageMetadata?.totalTokenCount ??
          (((data as { usageMetadata?: { promptTokenCount?: number } })?.usageMetadata?.promptTokenCount ?? 0) +
            ((data as { usageMetadata?: { candidatesTokenCount?: number } })?.usageMetadata?.candidatesTokenCount ?? 0)),
      },
    }
  } catch (error) {
    console.error("TTS generation error:", error)
    return { audioUrl: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }
  }
}

/**
 * Create a WAV buffer from PCM data
 * Gemini TTS returns PCM audio, we need to add WAV headers
 */
function createWavBuffer(pcmData: Buffer): Buffer {
  const sampleRate = 24000
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcmData.length
  const fileSize = 36 + dataSize

  const header = Buffer.alloc(44)
  
  // RIFF header
  header.write("RIFF", 0)
  header.writeUInt32LE(fileSize, 4)
  header.write("WAVE", 8)
  
  // fmt subchunk
  header.write("fmt ", 12)
  header.writeUInt32LE(16, 16) // Subchunk1Size for PCM
  header.writeUInt16LE(1, 20) // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  
  // data subchunk
  header.write("data", 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, pcmData])
}

/**
 * Regenerate audio for an existing lesson
 * Useful for retrying failed audio generation or changing language
 */
export async function regenerateLessonAudio(
  lessonId: string,
  title: string,
  content: string,
  language?: string
): Promise<string | null> {
  return generateLessonAudio(lessonId, title, content, language)
}
