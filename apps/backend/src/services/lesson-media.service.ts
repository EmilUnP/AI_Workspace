/**
 * AI Image Generator for Lessons
 * Uses Gemini for generating educational images with language-aware prompts
 * Images are saved to Supabase Storage for reliable delivery
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'

const AI_MODELS = {
  TEXT: 'gemini-2.5-flash',
  IMAGE_GENERATION: [
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image-preview',
  ],
  TTS_MODELS: [
    'gemini-2.5-flash-preview-tts'
  ],
} as const

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

/**
 * Get API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_KEY or GOOGLE_GEMINI_API_KEY environment variable')
  }
  return apiKey
}

/**
 * Detect the primary language of content
 */
async function detectLanguage(content: string): Promise<string> {
  try {
    const apiKey = getApiKey()
    const client = new GoogleGenerativeAI(apiKey)
    const model = client.getGenerativeModel({ model: AI_MODELS.TEXT })
    
    const prompt = `Detect the primary language of the following text. Return ONLY the language name in English (e.g., "English", "Russian", "Azerbaijani", "Turkish", etc.).

Text:
${content.substring(0, 1000)}

Language:`
    
    const response = await model.generateContent(prompt)
    const text = response.response?.text()?.trim() || "English"
    
    // Normalize common language names
    const normalized = text.toLowerCase()
    if (normalized.includes("russian") || normalized.includes("русский")) return "Russian"
    if (normalized.includes("azerbaijani") || normalized.includes("azərbaycan")) return "Azerbaijani"
    if (normalized.includes("turkish") || normalized.includes("türkçe")) return "Turkish"
    if (normalized.includes("english")) return "English"
    
    return text || "English"
  } catch (error) {
    console.error("Error detecting language:", error)
    return "English"
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
    const apiKey = getApiKey()
    const client = new GoogleGenerativeAI(apiKey)
    
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
    const model = client.getGenerativeModel({
      model: AI_MODELS.TEXT,
      systemInstruction: {
        role: "system",
        parts: [{ text: "You are an expert at creating detailed, specific prompts for AI image generation. Create prompts that will generate accurate educational diagrams, illustrations, and visual representations." }],
      },
    })

    const prompt = `You are creating detailed prompts for AI image generation to illustrate an educational lesson.

LESSON TOPIC: "${topic}"

LESSON CONTENT:
${content.substring(0, 2000)}

${languageInstruction}

TASK: Generate ${count} detailed, specific prompts for AI image generation. Each prompt should:
1. Describe EXACTLY what visual element would help explain the lesson concept
2. Be specific about diagrams, illustrations, or visual representations
3. Include educational context (e.g., "educational diagram", "scientific illustration")
4. Be 15-30 words long for best results
5. Focus on the SPECIFIC concepts taught in this lesson
${detectedLanguage !== "English" ? `6. CRITICAL: Specify that ALL text, labels, and annotations in the image MUST be in ${detectedLanguage} language` : ""}

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

    const response = await model.generateContent(prompt)
    const text = response.response?.text() || "[]"
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
 * Generate an image from a prompt using Gemini native image generation
 */
async function generateImageFromPrompt(prompt: string, language?: string): Promise<GeneratedImage | null> {
  try {
    const apiKey = getApiKey()
    
    // Enhance prompt for image generation
    let enhancedPrompt = `Educational illustration: ${prompt}. High quality, professional educational diagram, clean design, clear labels.`
    if (language && language !== "English") {
      enhancedPrompt += ` All text and labels should be in ${language}.`
    }
    
    // Try Gemini image generation models
    const modelsToTry = AI_MODELS.IMAGE_GENERATION
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying Gemini model ${modelName} for image generation...`)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `Generate an educational image: ${enhancedPrompt}` }]
            }],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"],
            }
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.warn(`Image API error for ${modelName}:`, response.status, errorText.substring(0, 300))
          continue
        }

        const data = await response.json()
        
        // Check for image in response parts
        const parts = data.candidates?.[0]?.content?.parts || []
        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith("image/")) {
            console.log(`Successfully generated image with ${modelName}`)
            return {
              url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              alt: prompt.substring(0, 100),
              base64Data: part.inlineData.data,
              mimeType: part.inlineData.mimeType,
              usage: {
                prompt_tokens: data?.usageMetadata?.promptTokenCount ?? 0,
                completion_tokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
                total_tokens:
                  data?.usageMetadata?.totalTokenCount ??
                  (data?.usageMetadata?.promptTokenCount ?? 0) +
                    (data?.usageMetadata?.candidatesTokenCount ?? 0),
                model_used: modelName,
              },
            }
          }
        }
        
        // No image in response, try next model
        console.warn(`No image in response from ${modelName}`)
      } catch (modelError: unknown) {
        console.warn(`Error with model ${modelName}:`, (modelError as Error).message)
        continue
      }
    }
    
    // If all models failed, return null
    console.warn("All Gemini image generation models failed")
    return null
  } catch (error) {
    console.warn("Image generation failed:", error)
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
    const lessonDir = path.join(env.AI_STORAGE_DIR, 'lessons', lessonId)
    await mkdir(lessonDir, { recursive: true })
    await writeFile(path.join(lessonDir, fileName), imageBuffer)
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
  try {
    // Detect language if not provided
    const detectedLanguage = language || await detectLanguage(content)
    
    // Generate detailed image prompts using Gemini
    const prompts = await generateImagePrompts(topic, content, count, detectedLanguage)

    // Generate images for each prompt with retry logic
    const generateImageWithRetry = async (
      prompt: string,
      index: number,
      retries: number = 2
    ): Promise<{ image: LessonImage | null; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; model_used?: string } }> => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        const image = await generateImageFromPrompt(prompt, detectedLanguage)
        if (image) {
          // Determine position based on index
          let position: "top" | "middle" | "bottom" = "middle"
          if (index === 0) position = "top"
          else if (index === count - 1) position = "bottom"

          // If lessonId provided and we have base64 data, upload to Supabase Storage
          let finalUrl = image.url
          if (lessonId && image.base64Data && image.mimeType) {
            const storageUrl = await uploadImageToStorage(
              lessonId,
              image.base64Data,
              image.mimeType,
              index
            )
            if (storageUrl) {
              finalUrl = storageUrl
            }
          }

          return {
            image: {
              url: finalUrl,
              alt: image.alt,
              description: prompt.substring(0, 150),
              position,
            } as LessonImage,
            usage: image.usage,
          }
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
      return { image: null }
    }

    let validImages: LessonImage[] = []
    const usageTotals = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, model_used: '' }
    let attempts = 0
    const maxAttempts = 2 // Try generating prompts twice if needed
    
    while (validImages.length < count && attempts < maxAttempts) {
      const currentPrompts = attempts === 0 ? prompts : await generateImagePrompts(topic, content, count - validImages.length, detectedLanguage)
      
      const imagePromises = currentPrompts.map((prompt, idx) => 
        generateImageWithRetry(prompt, validImages.length + idx)
      )

      const results = await Promise.all(imagePromises)
      for (const r of results) {
        if (r.usage) {
          usageTotals.prompt_tokens += r.usage.prompt_tokens
          usageTotals.completion_tokens += r.usage.completion_tokens
          usageTotals.total_tokens += r.usage.total_tokens
          if (!usageTotals.model_used && r.usage.model_used) usageTotals.model_used = r.usage.model_used
        }
      }
      const newValidImages = results
        .map((r) => r.image)
        .filter((img): img is LessonImage => img !== null)
      
      validImages = [...validImages, ...newValidImages]
      attempts++
      
      // If we got some images but not enough, try generating more prompts
      if (validImages.length < count && validImages.length > 0) {
        console.log(`Generated ${validImages.length} images, requested ${count}. Generating additional prompts...`)
      }
    }
    
    // If no images generated at all after all attempts, log warning
    if (validImages.length === 0) {
      console.warn("No images generated for lesson after all retry attempts")
    }
    
    // Ensure we have at most the requested count (prioritize first images)
    return { images: validImages.slice(0, count), usage: usageTotals }
  } catch (error) {
    console.error("Error generating lesson images:", error)
    return {
      images: generateFallbackImages(topic, count),
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    }
  }
}

export { detectLanguage, generateImagePrompts }






/**
 * TTS Audio Generator for Lessons
 * Uses Gemini TTS for generating lesson audio narration
 */

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
    for (const ttsModel of AI_MODELS.TTS_MODELS) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${ttsModel}:generateContent?key=${GEMINI_API_KEY}`,
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
        console.error(
          `TTS API error (lesson ${lessonId}) model=${ttsModel} attempt ${attempt + 1}/${maxRetries + 1}:`,
          response.status,
          errorText
        )

        if (response.status >= 500 && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)))
          continue
        }
      }
      if (data) break
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

    // Save to local lesson storage and serve via backend media route
    const lessonDir = path.join(env.AI_STORAGE_DIR, 'lessons', lessonId)
    await mkdir(lessonDir, { recursive: true })
    await writeFile(path.join(lessonDir, 'audio.wav'), wavBuffer)
    const mediaUrl = `/v1/lessons/${lessonId}/media/audio.wav`
    console.log(`TTS: Audio saved for lesson ${lessonId}:`, mediaUrl)
    return {
      audioUrl: mediaUrl,
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
