import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../config/env.js'

type Usage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  model_used?: string
}

export type LessonImage = {
  url: string
  alt: string
  description: string
  position: 'top' | 'middle' | 'bottom'
}

const getGeminiApiKey = () => process.env.GOOGLE_GENERATIVE_AI_KEY || process.env.GOOGLE_GEMINI_API_KEY

const imageModels = ['gemini-2.0-flash-preview-image-generation', 'gemini-2.0-flash-exp-image-generation']
const ttsModels = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts', 'gemini-2.5-flash-tts']

const stripMarkdown = (input: string) =>
  input
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

const createWavBuffer = (pcmData: Buffer): Buffer => {
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

const createPlaceholderSvg = (title: string, description: string) => {
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 60)
  const safeDescription = description.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 120)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#f8fafc"/>
<rect x="40" y="40" width="1200" height="640" rx="24" fill="#eef2ff" stroke="#c7d2fe" stroke-width="2"/>
<text x="80" y="130" font-size="42" font-family="Arial, sans-serif" fill="#1e3a8a" font-weight="700">${safeTitle}</text>
<text x="80" y="190" font-size="28" font-family="Arial, sans-serif" fill="#334155">${safeDescription}</text>
<text x="80" y="640" font-size="22" font-family="Arial, sans-serif" fill="#64748b">Generated lesson image placeholder</text>
</svg>`
}

export async function generateLessonImagesWithUsage(
  lessonId: string,
  topic: string,
  content: string,
  count = 3
): Promise<{ images: LessonImage[]; usage: Usage }> {
  const key = getGeminiApiKey()
  if (!key) return { images: [], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }

  const usage: Usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  const out: LessonImage[] = []
  const lessonDir = path.join(env.AI_STORAGE_DIR, 'lessons', lessonId)
  await mkdir(lessonDir, { recursive: true })

  const basePrompt = `Generate educational lesson image prompt for topic "${topic}" from content:\n${content.slice(0, 1200)}`
  const promptResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${basePrompt}\nReturn ${count} short image prompts as JSON array.` }] }],
      }),
    }
  )
  let prompts: string[] = []
  if (promptResponse.ok) {
    const json = (await promptResponse.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
    }
    usage.prompt_tokens += json.usageMetadata?.promptTokenCount ?? 0
    usage.completion_tokens += json.usageMetadata?.candidatesTokenCount ?? 0
    usage.total_tokens += json.usageMetadata?.totalTokenCount ?? 0
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        const parsed = JSON.parse(match[0]) as unknown
        if (Array.isArray(parsed)) prompts = parsed.filter((x): x is string => typeof x === 'string').slice(0, count)
      } catch {
        prompts = []
      }
    }
  }
  if (prompts.length === 0) prompts = Array.from({ length: count }, (_, i) => `Educational illustration ${i + 1} for ${topic}`)

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i]
    let imageSaved = false
    for (const model of imageModels) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate educational image: ${p}` }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
      })
      if (!r.ok) continue
      const j = (await r.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
      }
      usage.prompt_tokens += j.usageMetadata?.promptTokenCount ?? 0
      usage.completion_tokens += j.usageMetadata?.candidatesTokenCount ?? 0
      usage.total_tokens += j.usageMetadata?.totalTokenCount ?? 0
      usage.model_used = usage.model_used || model
      const inline = j.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData
      if (!inline?.data) continue
      const ext = inline.mimeType?.split('/')[1] || 'png'
      const fileName = `image_${i + 1}.${ext}`
      await writeFile(path.join(lessonDir, fileName), Buffer.from(inline.data, 'base64'))
      const position: LessonImage['position'] = i === 0 ? 'top' : i === prompts.length - 1 ? 'bottom' : 'middle'
      out.push({
        url: `/v1/lessons/${lessonId}/media/${fileName}`,
        alt: `${topic} image ${i + 1}`,
        description: p,
        position,
      })
      imageSaved = true
      break
    }
    if (!imageSaved) continue
  }

  if (out.length === 0) {
    for (let i = 0; i < count; i++) {
      const fileName = `image_${i + 1}.svg`
      const svg = createPlaceholderSvg(topic, prompts[i] || `Visual ${i + 1} for ${topic}`)
      await writeFile(path.join(lessonDir, fileName), svg, 'utf8')
      out.push({
        url: `/v1/lessons/${lessonId}/media/${fileName}`,
        alt: `${topic} image ${i + 1}`,
        description: prompts[i] || `Visual ${i + 1}`,
        position: i === 0 ? 'top' : i === count - 1 ? 'bottom' : 'middle',
      })
    }
  }

  return { images: out, usage }
}

export async function generateLessonAudioWithUsage(
  lessonId: string,
  title: string,
  content: string
): Promise<{ audioUrl: string | null; usage: Usage }> {
  const key = getGeminiApiKey()
  if (!key) return { audioUrl: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }

  const plainText = stripMarkdown(`${title}. ${content}`).slice(0, 8000)
  if (plainText.length < 50) return { audioUrl: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }

  let data:
    | {
        candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
      }
    | null = null
  let usedModel: string | undefined
  for (const model of ttsModels) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: plainText }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          },
        }),
      }
    )
    if (!response.ok) continue
    data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
    }
    const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    if (!audioBase64) continue
    usedModel = model
    break
  }
  const audioBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
  if (!audioBase64) return { audioUrl: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } }
  const usageMetadata = data?.usageMetadata

  const lessonDir = path.join(env.AI_STORAGE_DIR, 'lessons', lessonId)
  await mkdir(lessonDir, { recursive: true })
  await writeFile(path.join(lessonDir, 'audio.wav'), createWavBuffer(Buffer.from(audioBase64, 'base64')))

  return {
    audioUrl: `/v1/lessons/${lessonId}/media/audio.wav`,
    usage: {
      prompt_tokens: usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: usageMetadata?.candidatesTokenCount ?? 0,
      total_tokens:
        usageMetadata?.totalTokenCount ??
        (usageMetadata?.promptTokenCount ?? 0) + (usageMetadata?.candidatesTokenCount ?? 0),
      model_used: usedModel,
    },
  }
}
