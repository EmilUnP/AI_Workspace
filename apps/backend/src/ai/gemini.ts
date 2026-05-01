import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../config/env.js'

const client = new GoogleGenerativeAI(env.GOOGLE_GEMINI_API_KEY)

export async function generateText(prompt: string, model = 'gemini-2.0-flash') {
  const m = client.getGenerativeModel({ model })
  const res = await m.generateContent(prompt)
  return res.response.text().trim()
}

export async function generateJson<T>(prompt: string, model = 'gemini-2.0-flash'): Promise<T> {
  const text = await generateText(`${prompt}\n\nReturn ONLY valid JSON.`, model)
  const jsonText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/, '').trim()
  return JSON.parse(jsonText) as T
}

export async function generateEmbedding(text: string, model = 'gemini-embedding-001') {
  const tryEmbed = async (modelName: string) => {
    const m = client.getGenerativeModel({ model: modelName })
    const res = await m.embedContent(text)
    return res.embedding.values
  }

  try {
    return await tryEmbed(model)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Compatibility fallback for model/version changes on Google's side.
    if (model !== 'gemini-embedding-001' && message.includes('404')) {
      return tryEmbed('gemini-embedding-001')
    }
    throw error
  }
}
