import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { AI_MODELS } from '@eduator/config'

let genAI: GoogleGenerativeAI | null = null

/**
 * Get the Google Generative AI instance
 */
function getGenAI(): GoogleGenerativeAI {
  if (genAI) return genAI

  // Support both env variable names for flexibility
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.GOOGLE_GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_KEY or GOOGLE_GEMINI_API_KEY environment variable')
  }

  genAI = new GoogleGenerativeAI(apiKey)
  return genAI
}

/**
 * Safety settings for educational content
 */
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
]

/**
 * Get Gemini Pro model (for complex tasks)
 */
export function getGeminiPro(): GenerativeModel {
  return getGenAI().getGenerativeModel({
    model: AI_MODELS.GEMINI_PRO,
    safetySettings,
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 65536, // Increased for large exam generation
    },
  })
}

/**
 * Get Gemini Flash model (for faster responses)
 */
export function getGeminiFlash(): GenerativeModel {
  return getGenAI().getGenerativeModel({
    model: AI_MODELS.GEMINI_FLASH,
    safetySettings,
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 65536, // Increased for large exam generation
    },
  })
}

/**
 * Generate content with the specified model
 */
export async function generateContent(
  prompt: string,
  options?: {
    model?: 'pro' | 'flash'
    temperature?: number
    maxTokens?: number
  }
): Promise<{
  text: string
  tokensUsed: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}> {
  const model = options?.model === 'flash' ? getGeminiFlash() : getGeminiPro()

  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()
  const usage = (response as unknown as {
    usageMetadata?: {
      promptTokenCount?: number
      candidatesTokenCount?: number
      totalTokenCount?: number
    }
  }).usageMetadata
  const promptTokens = usage?.promptTokenCount
  const completionTokens = usage?.candidatesTokenCount
  const totalTokens = usage?.totalTokenCount

  // Estimate tokens (rough approximation)
  const tokensUsed = totalTokens ?? Math.ceil((prompt.length + text.length) / 4)

  return { text, tokensUsed, promptTokens, completionTokens, totalTokens }
}

/**
 * Generate content with streaming
 */
export async function* generateContentStream(
  prompt: string,
  options?: { model?: 'pro' | 'flash' }
): AsyncGenerator<string> {
  const model = options?.model === 'flash' ? getGeminiFlash() : getGeminiPro()

  const result = await model.generateContentStream(prompt)

  for await (const chunk of result.stream) {
    const chunkText = chunk.text()
    if (chunkText) {
      yield chunkText
    }
  }
}

/**
 * Generate content with JSON output
 */
export async function generateJSON<T = unknown>(
  prompt: string,
  options?: { model?: 'pro' | 'flash' }
): Promise<{ data: T; tokensUsed: number }> {
  const jsonPrompt = `${prompt}

IMPORTANT: Respond ONLY with valid JSON. Do not include any markdown formatting, code blocks, or explanatory text. The response must start with { or [ and be valid JSON.`

  const { text, tokensUsed } = await generateContent(jsonPrompt, options)

  // Clean up response and parse JSON
  let cleanedText = text.trim()
  
  // Remove markdown code blocks if present
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.slice(7)
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.slice(3)
  }
  
  if (cleanedText.endsWith('```')) {
    cleanedText = cleanedText.slice(0, -3)
  }
  
  cleanedText = cleanedText.trim()

  try {
    const data = JSON.parse(cleanedText) as T
    return { data, tokensUsed }
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', cleanedText)
    throw new Error('AI response was not valid JSON')
  }
}

/**
 * Chat session for multi-turn conversations
 */
export class GeminiChat {
  private model: GenerativeModel
  private chat: ReturnType<GenerativeModel['startChat']>
  private history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []

  constructor(
    options?: {
      model?: 'pro' | 'flash'
      systemPrompt?: string
    }
  ) {
    this.model = options?.model === 'flash' ? getGeminiFlash() : getGeminiPro()

    if (options?.systemPrompt) {
      this.history.push({
        role: 'user',
        parts: [{ text: `System: ${options.systemPrompt}` }],
      })
      this.history.push({
        role: 'model',
        parts: [{ text: 'I understand. I will follow these instructions.' }],
      })
    }

    this.chat = this.model.startChat({ history: this.history })
  }

  async sendMessage(message: string): Promise<{
    text: string
    tokensUsed: number
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }> {
    const result = await this.chat.sendMessage(message)
    const response = result.response
    const text = response.text()
    const usage = (response as unknown as {
      usageMetadata?: {
        promptTokenCount?: number
        candidatesTokenCount?: number
        totalTokenCount?: number
      }
    }).usageMetadata
    const promptTokens = usage?.promptTokenCount
    const completionTokens = usage?.candidatesTokenCount
    const totalTokens = usage?.totalTokenCount

    // Update history
    this.history.push({ role: 'user', parts: [{ text: message }] })
    this.history.push({ role: 'model', parts: [{ text }] })

    const tokensUsed = totalTokens ?? Math.ceil((message.length + text.length) / 4)

    return { text, tokensUsed, promptTokens, completionTokens, totalTokens }
  }

  async *sendMessageStream(message: string): AsyncGenerator<string> {
    const result = await this.chat.sendMessageStream(message)

    let fullResponse = ''

    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      if (chunkText) {
        fullResponse += chunkText
        yield chunkText
      }
    }

    // Update history after stream completes
    this.history.push({ role: 'user', parts: [{ text: message }] })
    this.history.push({ role: 'model', parts: [{ text: fullResponse }] })
  }

  getHistory() {
    return this.history
  }

  clearHistory() {
    this.history = []
    this.chat = this.model.startChat({ history: [] })
  }
}
