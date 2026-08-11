/**
 * AI Image Generator for Lessons
 * Uses OpenRouter for generating educational images with language-aware prompts
 * Images are saved to Supabase Storage for reliable delivery
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { AiGateway } from '../ai/gateway.js'
import { getAiContext } from '../ai/request-context.js'
import { env } from '../config/env.js'
import { useDatabaseFileStorage } from '../utils/document-file.js'
import { saveLessonMediaFile } from '../utils/lesson-media-storage.js'
import { buildImagePromptContentExcerpt } from './lesson-content-sanitize.js'

export interface LessonImage {
  url: string
  alt: string
  description: string
  position: 'top' | 'middle' | 'bottom'
}

interface GeneratedImage {
  url: string
  alt: string
  base64Data?: string
  mimeType?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    model_used?: string
  }
}

function getGateway() {
  const { app, userId } = getAiContext()
  return { gateway: new AiGateway(app), userId }
}

/**
 * Detect the primary language of content
 */
async function detectLanguage(content: string): Promise<string> {
  try {
    const { gateway, userId } = getGateway()
    const prompt = `Detect the primary language of the following text. Return ONLY the language name in English (e.g., "English", "Russian", "Azerbaijani", "Turkish", etc.).

Text:
${content.substring(0, 1000)}

Language:`
    const response = await gateway.generateText({
      workload: 'lightweight_text',
      prompt,
      userId,
    })
    const text = response.text || 'English'

    const normalized = text.toLowerCase()
    if (normalized.includes('russian') || normalized.includes('русский')) return 'Russian'
    if (normalized.includes('azerbaijani') || normalized.includes('azərbaycan')) return 'Azerbaijani'
    if (normalized.includes('turkish') || normalized.includes('türkçe')) return 'Turkish'
    if (normalized.includes('english')) return 'English'

    return text || 'English'
  } catch (error) {
    console.error('Error detecting language:', error)
    return 'English'
  }
}

/**
 * Generate detailed image prompts using AI
 */
async function generateImagePrompts(
  topic: string,
  content: string,
  count: number = 3,
  language?: string
): Promise<string[]> {
  try {
    const { gateway, userId } = getGateway()

    // Detect language if not provided
    const detectedLanguage = language || await detectLanguage(content)
    
    // Create language instruction for image prompts
    const languageInstruction = detectedLanguage !== "English"
      ? `CRITICAL LANGUAGE REQUIREMENT: The lesson content is in ${detectedLanguage} language. 
ALL text, labels, annotations, and written content in the generated images MUST be in ${detectedLanguage} language.
- All labels on diagrams MUST be in ${detectedLanguage}
- All text annotations MUST be in ${detectedLanguage}
- All written explanations in images MUST be in ${detectedLanguage}
- Do NOT use English text in images unless it's a universal technical term`
      : ""
    
    // Use model for generating detailed prompts
    const contentForPrompt = buildImagePromptContentExcerpt(content, 3600)

    const prompt = `You are creating detailed prompts for AI image generation to illustrate an educational lesson.

LESSON TOPIC: "${topic}"

LESSON CONTENT (excerpt; figure sections may be appended so prompts align with headings like "Şəkil 1" / "Figure 1"):
${contentForPrompt}

${languageInstruction}

TASK: Generate ${count} detailed, specific prompts for AI image generation. Each prompt should:
1. Describe EXACTLY what visual element would help explain the lesson concept
2. Be specific about diagrams, illustrations, or visual representations
3. Include educational context (e.g., "educational diagram", "scientific illustration")
4. Be 15-30 words long for best results
5. Focus on the SPECIFIC concepts taught in this lesson
6. ORDER: If the content uses numbered figures (e.g. "### Şəkil 1", "### Figure 1"), prompt 1 MUST match the first figure's theme, prompt 2 the second, and so on (then remaining prompts for other key visuals). Do not invent unrelated scenes when a figure title already defines the subject.
${detectedLanguage !== "English" ? `7. CRITICAL: Specify that ALL text, labels, and annotations in the image MUST be in ${detectedLanguage} language` : ""}

EXAMPLES OF GOOD PROMPTS:
- "Educational diagram showing the water cycle with labeled stages: evaporation, condensation, precipitation, and collection"
- "Scientific illustration of a plant cell with clearly labeled organelles including nucleus, mitochondria, and chloroplasts"
- "Visual representation of mathematical fractions using colorful pie charts and number lines"

EXAMPLES OF BAD PROMPTS (too vague):
- "education image"
- "science concept"
- "learning material"

Return ONLY a JSON array with exactly ${count} detailed prompt strings.

Format: ["detailed prompt 1", "detailed prompt 2", "detailed prompt 3"]

Generate ${count} highly detailed, specific prompts:`

    const response = await gateway.generateText({
      workload: 'lightweight_text',
      userId,
      systemInstruction:
        'You are an expert at creating detailed, specific prompts for AI image generation. Create prompts that will generate accurate educational diagrams, illustrations, and visual representations.',
      prompt,
    })
    const text = response.text || '[]'
    const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()

    try {
      const prompts = JSON.parse(cleanText)
      if (Array.isArray(prompts) && prompts.length > 0) {
        return prompts.slice(0, count).filter((p: unknown) => typeof p === "string" && (p as string).trim().length > 0)
      }
    } catch {
      // Fallback
    }

    // Fallback: create detailed prompts from topic
    const fallbackPrompts = [
      `Educational diagram illustrating ${topic} with clear labels and visual elements`,
      `Scientific illustration of ${topic} concept showing key components and processes`,
      `Detailed visual representation of ${topic} for educational purposes`,
    ]
    return fallbackPrompts.slice(0, count)
  } catch (error) {
    console.error("Error generating image prompts:", error)
    return [
      `Educational diagram illustrating ${topic}`,
      `Scientific illustration of ${topic}`,
      `Visual representation of ${topic}`,
    ].slice(0, count)
  }
}

/**
 * Generate an image from a prompt using OpenRouter image generation
 */
async function generateImageFromPrompt(prompt: string, language?: string): Promise<GeneratedImage | null> {
  try {
    const { gateway, userId } = getGateway()

    let enhancedPrompt = `Educational illustration: ${prompt}. High quality, professional educational diagram, clean design, clear labels.`
    if (language && language !== 'English') {
      enhancedPrompt += ` All text and labels should be in ${language}.`
    }

    const result = await gateway.generateImage({
      prompt: `Generate an educational image: ${enhancedPrompt}`,
      userId,
    })
    const image = result.images[0]
    if (!image) {
      console.warn('No image in OpenRouter response')
      return null
    }

    console.log(`Successfully generated image with ${result.modelUsed}`)
    return {
      url: `data:${image.mimeType};base64,${image.base64}`,
      alt: prompt.substring(0, 100),
      base64Data: image.base64,
      mimeType: image.mimeType,
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        model_used: result.modelUsed,
      },
    }
  } catch (error) {
    console.warn('Image generation failed:', error)
    return null
  }
}

/**
 * Upload an image to Supabase Storage
 * @param lessonId - The lesson ID for organizing images
 * @param imageData - Base64 encoded image data
 * @param mimeType - Image MIME type (e.g., "image/png")
 * @param index - Image index for naming
 * @returns The public URL of the uploaded image, or null if upload failed
 */
async function uploadImageToStorage(
  lessonId: string,
  imageData: string,
  mimeType: string,
  index: number
): Promise<string | null> {
  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, 'base64')

    // Determine file extension from mime type
    const extension = mimeType.split('/')[1] || 'png'
    const fileName = `image_${index}.${extension}`
    if (useDatabaseFileStorage()) {
      await saveLessonMediaFile(lessonId, fileName, mimeType, imageBuffer)
    } else {
      const lessonDir = path.join(env.AI_STORAGE_DIR, 'lessons', lessonId)
      await mkdir(lessonDir, { recursive: true })
      await writeFile(path.join(lessonDir, fileName), imageBuffer)
    }
    const mediaUrl = `/v1/lessons/${lessonId}/media/${fileName}`
    console.log(`Image ${index} saved for lesson ${lessonId}:`, mediaUrl)
    return mediaUrl
  } catch (error) {
    console.error('Error uploading image to storage:', error)
    return null
  }
}

/**
 * Generate placeholder images when AI generation fails
 * Returns empty array since we no longer use unreliable external URLs
 */
function generateFallbackImages(_topic: string, _count: number): LessonImage[] {
  // No longer using Unsplash URLs as they are unreliable
  // Return empty array - lesson will work without images
  console.log("Image generation failed, no fallback images available")
  return []
}

/**
 * Generate lesson images using AI and save to Supabase Storage
 * @param topic - The lesson topic
 * @param content - The lesson content for context
 * @param count - Number of images to generate (default: 3)
 * @param language - Target language for image labels
 * @param lessonId - Optional lesson ID for saving to storage (if not provided, returns base64 URLs)
 */
export async function generateLessonImages(
  topic: string,
  content: string,
  count: number = 3,
  language?: string,
  lessonId?: string
): Promise<LessonImage[]> {
  const result = await generateLessonImagesWithUsage(topic, content, count, language, lessonId)
  return result.images
}

export async function generateLessonImagesWithUsage(
  topic: string,
  content: string,
  count: number = 3,
  language?: string,
  lessonId?: string
): Promise<{
  images: LessonImage[]
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; model_used?: string }
}> {
  const targetCount = Math.max(1, Math.min(count, 3))
  try {
    // Prefer explicit language from the lesson request; only detect when missing.
    const detectedLanguage =
      language && language.trim()
        ? language.trim().length <= 2
          ? language.trim().toLowerCase() === 'az'
            ? 'Azerbaijani'
            : language.trim().toLowerCase() === 'ru'
              ? 'Russian'
              : language.trim().toLowerCase() === 'tr'
                ? 'Turkish'
                : language.trim().toLowerCase() === 'en'
                  ? 'English'
                  : language.trim()
          : language.trim()
        : await detectLanguage(content)

    const prompts = (await generateImagePrompts(topic, content, targetCount, detectedLanguage)).slice(
      0,
      targetCount
    )

    // Hard cap: one API call per image slot. Retries previously multiplied cost
    // (3 prompts × 3 attempts = 9 billed image generations) when parsing failed.
    const usageTotals = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, model_used: '' }
    const validImages: LessonImage[] = []

    for (let index = 0; index < prompts.length && validImages.length < targetCount; index++) {
      const prompt = prompts[index]
      const image = await generateImageFromPrompt(prompt, detectedLanguage)
      if (!image) continue

      let position: 'top' | 'middle' | 'bottom' = 'middle'
      if (index === 0) position = 'top'
      else if (index === targetCount - 1) position = 'bottom'

      let finalUrl = image.url
      if (lessonId && image.base64Data && image.mimeType) {
        const storageUrl = await uploadImageToStorage(lessonId, image.base64Data, image.mimeType, index)
        if (storageUrl) finalUrl = storageUrl
      }

      if (image.usage) {
        usageTotals.prompt_tokens += image.usage.prompt_tokens
        usageTotals.completion_tokens += image.usage.completion_tokens
        usageTotals.total_tokens += image.usage.total_tokens
        if (!usageTotals.model_used && image.usage.model_used) {
          usageTotals.model_used = image.usage.model_used
        }
      }

      validImages.push({
        url: finalUrl,
        alt: image.alt,
        description: prompt.substring(0, 150),
        position,
      })
    }

    if (validImages.length === 0) {
      console.warn('No images generated for lesson (parser/API returned no usable image data)')
    }

    return { images: validImages.slice(0, targetCount), usage: usageTotals }
  } catch (error) {
    console.error('Error generating lesson images:', error)
    return {
      images: generateFallbackImages(topic, targetCount),
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    }
  }
}

export { detectLanguage, generateImagePrompts }






/**
 * TTS Audio Generator for Lessons via OpenRouter speech API
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
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; model_used?: string }
}> {
  try {
    const { gateway, userId } = getGateway()
    const plainText = `${title}. ${content}`
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .substring(0, 8000)

    if (plainText.length < 50) {
      console.log('TTS: Content too short, skipping audio generation')
      return { audioUrl: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }
    }

    console.log(
      `TTS: Generating audio for lesson ${lessonId}, text length: ${plainText.length}, language: ${language || 'auto-detect'}`
    )

    const speech = await gateway.generateSpeech({
      text: plainText,
      userId,
      voice: 'nova',
      responseFormat: 'mp3',
    })

    const isMp3 = speech.mimeType.includes('mpeg') || speech.mimeType.includes('mp3')
    const fileName = isMp3 ? 'audio.mp3' : 'audio.wav'
    const mimeType = isMp3 ? 'audio/mpeg' : 'audio/wav'
    const audioBuffer =
      isMp3 || speech.mimeType.includes('wav')
        ? speech.audio
        : createWavBuffer(speech.audio)

    if (useDatabaseFileStorage()) {
      await saveLessonMediaFile(lessonId, fileName, mimeType, audioBuffer)
    } else {
      const lessonDir = path.join(env.AI_STORAGE_DIR, 'lessons', lessonId)
      await mkdir(lessonDir, { recursive: true })
      await writeFile(path.join(lessonDir, fileName), audioBuffer)
    }

    const mediaUrl = `/v1/lessons/${lessonId}/media/${fileName}`
    console.log(`TTS: Audio saved for lesson ${lessonId}:`, mediaUrl)
    return {
      audioUrl: mediaUrl,
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        model_used: speech.modelUsed,
      },
    }
  } catch (error) {
    console.error('TTS generation error:', error)
    return { audioUrl: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }
  }
}

/** Wrap raw PCM as WAV when a provider returns uncompressed audio. */
function createWavBuffer(pcmData: Buffer): Buffer {
  const sampleRate = 24000
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcmData.length
  const fileSize = 36 + dataSize

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(fileSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
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
