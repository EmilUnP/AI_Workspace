/**
 * Enhanced Lesson Generator Service
 * Uses RAG (Retrieval Augmented Generation) for generating lesson content from documents
 */

import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { sanitizeBrokenMarkdownTableLines } from './lesson-content-sanitize.js'
import { generateLessonImagesWithUsage, type LessonImage } from './lesson-media.service.js'
import { DocumentRagService } from './document-rag.service.js'
import { generateLessonAudioWithUsage } from './lesson-media.service.js'
import { AiGateway } from '../ai/gateway.js'
import { runWithAiContext, getAiContext } from '../ai/request-context.js'

// Compatibility fallbacks for this standalone generator API.
// In current backend flow, RAG is handled by LessonAiService + DocumentRagService.
let ragServiceRef: DocumentRagService | null = null

const getParsedDocumentText = async (documentId: string, userId: string, _extractText = false): Promise<string | null> => {
  if (!ragServiceRef) return null
  return ragServiceRef.getParsedDocumentText(documentId, userId)
}
const getRelevantChunks = async (
  documentId: string,
  documentText: string,
  query: string,
  topK = 7
): Promise<string[]> => {
  if (ragServiceRef) {
    try {
      const chunks = await ragServiceRef.getRelevantChunks(documentId, currentRagUserId, query, topK)
      if (chunks.length > 0) return chunks
    } catch {
      // fallback below
    }
  }
  return documentText
    ? documentText
        .split(/\n\n+/)
        .filter((chunk) => chunk.trim().length > 0)
        .slice(0, topK)
    : []
}
const getRelevantContentFromDocuments = async (
  documentIds: string[],
  userId: string,
  query: string,
  chunksPerDocument = 7
): Promise<string> => {
  if (!ragServiceRef) return ''
  return ragServiceRef.getRelevantContentFromDocuments(documentIds, userId, query, chunksPerDocument)
}

let currentRagUserId = ''

// Types for generated lesson content
export interface GeneratedLesson {
  title: string
  content: string  // Markdown formatted content
  learning_objectives: string[]  // 3-5 learning objectives
  duration_minutes: number  // Estimated reading time
  mini_test: Array<{
    question: string
    options: string[]
    correct_answer: number
    explanation: string
  }>
  images: LessonImage[]
  usage?: {
    input_tokens: number
    output_tokens: number
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    model_used: string
    image_prompt_tokens?: number
    image_completion_tokens?: number
    image_total_tokens?: number
    image_model_used?: string
  }
}

const miniTestItemSchema = z.object({
  question: z.string().min(5),
  options: z.array(z.string().min(1)).min(4).max(4),
  correct_answer: z.number().int().min(0).max(3),
  explanation: z.string().min(2),
})

/** Always persist exactly this many mini-test questions (independent of content length). */
const MINI_TEST_TARGET = 5

export interface GenerateLessonParams {
  documentId?: string | null
  topic: string
  userId: string
  /** Language: 2-letter code (en, az, ru, tr, de, fr, es, ar) — same as exam generation. Prompts use full name. */
  language?: string
  includeImages?: boolean
  /** Teacher-provided learning objectives (free-text); when set, the AI uses these instead of generating its own. */
  objectives?: string
  /** Target grade level (e.g. 'grade_9', 'undergraduate'). The AI tailors complexity and vocabulary. */
  gradeLevel?: string
  /** Optional free-text core prompt that defines lesson focus, constraints, or style. */
  corePrompt?: string
}

/** Optional content and format options for lesson generation (UI, API, course generation). */
export interface LessonGenerationContentOptions {
  /** Include comparison/structured tables in content (default true). */
  includeTables?: boolean
  /** Include 1–2 key figures/diagrams (described or as image prompts) (default false). */
  includeFigures?: boolean
  /** Include chart-like data (e.g. trends in table form or chart descriptions) (default false). */
  includeCharts?: boolean
  /** Target length: short ≈ 1 page, medium ≈ 2–3 pages, full = comprehensive (default medium). */
  contentLength?: 'short' | 'medium' | 'full'
}

/** Same as exam-generator: map 2-letter codes to full language names for AI prompts. */
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  az: 'Azerbaijani',
  ru: 'Russian',
  tr: 'Turkish',
}

/** Normalize language input: accept 2-letter code (preferred) or full name; return display name for prompts. */
function languageCodeToName(language?: string): string {
  if (!language || typeof language !== 'string') return 'English'
  const trimmed = language.trim()
  const code = trimmed.length === 2 ? trimmed.toLowerCase() : null
  if (code && LANGUAGE_NAMES[code]) return LANGUAGE_NAMES[code]
  return trimmed
}

/** Fallback phrases in target language when AI output is missing or invalid (avoids saving user's topic language). */
const FALLBACK_PHRASES: Record<string, { title: string; question: string; explanation: string }> = {
  en: { title: 'Lesson', question: 'What is the main concept of this lesson?', explanation: 'This option is correct because it matches the key concept explained in the lesson.' },
  az: { title: 'Dərs', question: 'Bu dərsin əsas mövzusu nədir?', explanation: 'Bu cavab doğrudur, çünki dərsdə izah edilən əsas anlayışa uyğundur.' },
  ru: { title: 'Урок', question: 'Какова основная тема этого урока?', explanation: 'Этот вариант верный, потому что он соответствует ключевому понятию, объяснённому в уроке.' },
  tr: { title: 'Ders', question: 'Bu dersin ana konusu nedir?', explanation: 'Bu seçenek doğrudur çünkü derste açıklanan temel kavramla uyumludur.' },
  de: { title: 'Lektion', question: 'Was ist das Hauptthema dieser Lektion?', explanation: 'Diese Option ist korrekt, weil sie zum zentralen in der Lektion erklärten Konzept passt.' },
  fr: { title: 'Leçon', question: "Quel est le sujet principal de cette leçon ?", explanation: "Cette réponse est correcte, car elle correspond au concept clé expliqué dans la leçon." },
  es: { title: 'Lección', question: '¿Cuál es el tema principal de esta lección?', explanation: 'Esta opción es correcta porque coincide con el concepto clave explicado en la lección.' },
  ar: { title: 'الدرس', question: 'ما الموضوع الرئيسي لهذا الدرس؟', explanation: 'هذا الخيار صحيح لأنه يطابق الفكرة الأساسية المشروحة في الدرس.' },
}
function getFallbackPhrases(languageCode?: string): { title: string; question: string; explanation: string } {
  const code = normalizeLanguageCode(languageCode)
  return FALLBACK_PHRASES[code ?? 'en'] ?? FALLBACK_PHRASES.en
}

function normalizeLanguageCode(language?: string): string {
  const raw = (language || '').trim().toLowerCase()
  if (!raw) return 'en'
  if (raw.length === 2 && LANGUAGE_NAMES[raw]) return raw
  const byName: Record<string, string> = {
    english: 'en',
    azerbaijani: 'az',
    azeri: 'az',
    russian: 'ru',
    turkish: 'tr',
  }
  return byName[raw] || 'en'
}

function sanitizeExplanation(explanation: unknown): string {
  const raw = typeof explanation === 'string' ? explanation.trim() : ''
  if (!raw) return ''

  const patterns = [
    /^according to (the )?(text|document|source)[,:]?\s*/i,
    /^the (text|document|source) (states|says|mentions|indicates|explains)\s+(that\s*)?/i,
    /^based on (the )?(text|document|source)[,:]?\s*/i,
    /^mətndə .*?(qeyd olunur ki|deyilir ki)[,:]?\s*/i,
    /^в тексте (сказано|указано|говорится|отмечено)(,?\s*что)?\s*/i,
    /^metinde .*?(belirtilir|ifade edilir|denir)(\s*ki)?[,:]?\s*/i,
  ]

  let cleaned = raw
  patterns.forEach((re) => {
    cleaned = cleaned.replace(re, '')
  })
  cleaned = cleaned.trim().replace(/^[\s,.:;-]+/, '')
  return cleaned || raw
}

/** Lesson bodies are long; without a high cap OpenRouter/Gemini often truncates mid-JSON. */
const LESSON_MAX_OUTPUT_TOKENS = 16384

async function generateLessonModelText(
  prompt: string,
  systemInstruction: string,
  maxTokens: number = LESSON_MAX_OUTPUT_TOKENS
) {
  const { app, userId } = getAiContext()
  const gateway = new AiGateway(app)
  return gateway.generateText({
    workload: 'lesson_generation',
    prompt,
    systemInstruction,
    userId,
    temperature: 0.7,
    maxTokens,
  })
}

type LessonJsonShape = {
  title?: string
  learning_objectives?: string[]
  content?: string
  mini_test?: GeneratedLesson['mini_test']
}

/**
 * Prefer structured JSON (same path as exam generation). Falls back to plain text + safeJsonParse.
 */
async function generateLessonStructuredJson(
  prompt: string,
  systemInstruction: string
): Promise<{ lesson: LessonJsonShape; text: string; modelUsed: string; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }> {
  const { app, userId } = getAiContext()
  const gateway = new AiGateway(app)

  try {
    const parsed = await gateway.generateJson<LessonJsonShape>({
      workload: 'lesson_generation',
      prompt,
      systemInstruction,
      userId,
      temperature: 0.7,
      maxTokens: LESSON_MAX_OUTPUT_TOKENS,
    })
    return {
      lesson: parsed,
      text: JSON.stringify(parsed),
      modelUsed: 'openrouter',
      usage: undefined,
    }
  } catch (error) {
    console.warn(
      '[Lesson Generator] generateJson failed, falling back to text parse:',
      error instanceof Error ? error.message : error
    )
    const response = await generateLessonModelText(prompt, systemInstruction)
    const text = response.text || '{}'
    const fallbackShell: GeneratedLesson = {
      title: '',
      content: '',
      learning_objectives: [],
      duration_minutes: 5,
      mini_test: [],
      images: [],
    }
    const lesson = safeJsonParse<GeneratedLesson>(text, fallbackShell)
    return {
      lesson,
      text,
      modelUsed: response.modelUsed,
      usage: response.usage,
    }
  }
}

function isPlaceholderLessonContent(content: unknown): boolean {
  if (typeof content !== 'string') return true
  const normalized = content.trim().toLowerCase()
  if (normalized.length < 80) return true
  return (
    normalized.includes('content is being prepared') ||
    normalized.includes('məzmun hazırlanır') ||
    normalized.includes('содержание готовится')
  )
}

/**
 * Markdown-only body generation when JSON paths fail (avoids stuffing long markdown into a JSON string).
 */
async function generateLessonBodyMarkdown(
  topic: string,
  context: string,
  targetLanguage: string,
  systemInstruction: string,
  lengthInstruction: string,
  extraInstructions: string
): Promise<{ title: string; content: string; learning_objectives: string[]; modelUsed: string; usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number } }> {
  const prompt = `${extraInstructions}Create a comprehensive lesson about "${topic}" in ${targetLanguage}.${lengthInstruction}

Output ONLY markdown (no JSON, no code fences):
# <Lesson title in ${targetLanguage}>
## Learning Objectives
- objective 1
- objective 2
- objective 3
## Lesson Content
(full lesson body with ## / ### headings, lists, and tables as needed)

Do NOT include a Mini Test, quiz, or practice questions in this markdown. Questions are generated separately.

Source material:
${context}

Topic: ${topic}`

  const response = await generateLessonModelText(prompt, systemInstruction)
  const parsed = parseMarkdownLesson(response.text || '', topic)
  return {
    ...parsed,
    modelUsed: response.modelUsed,
    usage: response.usage,
  }
}

function parseMarkdownLesson(
  raw: string,
  fallbackTitle: string
): { title: string; content: string; learning_objectives: string[] } {
  let text = (raw || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:markdown|md)?\s*/i, '').replace(/\s*```$/, '').trim()
  }

  const titleMatch = text.match(/^#\s+(.+)$/m)
  const title = (titleMatch?.[1] || fallbackTitle).trim()

  const objectives = extractLearningObjectivesFromContent(text)

  // Prefer content after a Lesson Content / Məzmun heading; otherwise use full markdown minus the H1 title line
  const contentSection = text.split(/^##\s+(Lesson Content|Məzmun|Содержание|İçerik)\s*$/im)
  let content =
    contentSection.length > 1
      ? contentSection.slice(1).join('\n').trim()
      : text.replace(/^#\s+.+$/m, '').trim()

  if (!content.startsWith('#')) {
    content = `# ${title}\n\n${content}`.trim()
  }

  return { title, content, learning_objectives: objectives }
}

/**
 * Normalize lesson content: strip disclaimers, fix markdown, remove meta-commentary,
 * strip leaked JSON blocks, and remove any mini-test block (mini-test lives in its own field/tab).
 */
function normalizeLessonContent(content: string): string {
  if (!content || typeof content !== 'string') return content
  let out = sanitizeBrokenMarkdownTableLines(content.trim())

  // Strip disclaimer / meta-commentary paragraphs (common when topic and document mismatch)
  const disclaimerPatterns = [
    /\n?\s*Therefore,?\s*it\s+is\s+impossible\s+to\s+create[^.]*\.\s*/gi,
    /\n?\s*The\s+content\s+below\s+will\s+(briefly\s+)?summarize[^.]*\.\s*/gi,
    /\n?\s*as\s+per\s+the\s+instructions[^.]*\.\s*/gi,
    /\n?\s*based\s+ONLY\s+on\s+the\s+provided\s+material[^.]*\.\s*/gi,
    /\n?\s*but\s+it\s+will\s+not\s+pertain\s+to[^.]*\.\s*/gi,
  ]
  for (const p of disclaimerPatterns) {
    out = out.replace(p, '\n\n')
  }

  // Remove "(from provided PDF)" or similar from headings and text
  out = out.replace(/\s*\(from\s+provided\s+PDF\)\s*/gi, ' ')
  out = out.replace(/\s*\(provided\s+PDF\)\s*/gi, ' ')

  // Strip leaked JSON blocks: ```json ... ``` or stray JSON key-value lines at paragraph start
  out = out.replace(/```json\s*[\s\S]*?```/gi, '\n\n')
  out = out.replace(/```\s*\{[\s\S]*?\}\s*```/g, '\n\n')
  // Remove lines that look like stray JSON (e.g. "title": "..." or "key": value) at start of a line
  out = out.replace(/\n\s*"[^"]+"\s*:\s*(?:"[^"]*"|\d+|true|false|null)\s*,?\s*/g, '\n')

  // Normalize ***label:** to **label:** (bold only)
  out = out.replace(/\*\*\*([^*]+)\*\*\*:/g, '**$1**:')

  // Models often paste the quiz into "content" even though mini_test is a separate JSON field/UI tab.
  out = stripEmbeddedMiniTestFromContent(out)

  // Collapse multiple blank lines
  out = out.replace(/\n{3,}/g, '\n\n')

  return out.trim()
}

/**
 * Remove quiz sections embedded in lesson markdown (kept only in mini_test / Mini test tab).
 */
function stripEmbeddedMiniTestFromContent(content: string): string {
  if (!content) return content

  const heading =
    /(?:^|\n)#{1,3}\s*(?:mini[\s-]?test|mini[\s-]?quiz|practice\s+questions?|knowledge\s+check|comprehension\s+check|self[\s-]?check|check\s+your\s+understanding|kiçik\s+test|mini\s+test|тест|мини[\s-]?тест|alıştırma\s+soruları)\b[^\n]*/i

  const match = heading.exec(content)
  if (match && typeof match.index === 'number') {
    return content.slice(0, match.index).trim()
  }

  // Fallback: "Mini Test" as a bold/plain line near the end
  const plain = /(?:^|\n)\s*(?:\*\*)?mini[\s-]?test(?:\*\*)?\s*(?:\n|$)/i
  const plainMatch = plain.exec(content)
  if (plainMatch && typeof plainMatch.index === 'number' && plainMatch.index > content.length * 0.4) {
    return content.slice(0, plainMatch.index).trim()
  }

  return content
}

/**
 * Extract learning_objectives array from raw API response text.
 * Use when JSON parse fails (e.g. truncated response) or when parsed result has empty objectives,
 * so we still recover objectives that appear in the response (e.g. before a long "content" field).
 */
function extractLearningObjectivesFromRawResponse(rawText: string): string[] {
  if (!rawText || typeof rawText !== 'string') return []
  const key = '"learning_objectives"'
  const idx = rawText.indexOf(key)
  if (idx === -1) return []
  const afterKey = rawText.slice(idx + key.length)
  const openBracket = afterKey.indexOf('[')
  if (openBracket === -1) return []
  let depth = 1
  let pos = openBracket + 1
  const chunk = afterKey.slice(openBracket)
  while (pos < chunk.length && depth > 0) {
    const c = chunk[pos]
    if (c === '[') depth++
    else if (c === ']') depth--
    pos++
  }
  if (depth !== 0) return []
  try {
    const arrStr = chunk.slice(0, pos)
    const arr = JSON.parse(arrStr) as unknown
    if (!Array.isArray(arr)) return []
    return arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map(s => s.trim())
  } catch {
    return []
  }
}

/**
 * Extract learning objectives from markdown content when the AI puts them in
 * a "Learning Objectives" section but omits or empties the JSON learning_objectives field.
 * Matches: ## Learning Objectives (or ###) followed by numbered (1. 2.) or bullet (- *) list.
 */
function extractLearningObjectivesFromContent(content: string): string[] {
  if (!content || typeof content !== 'string') return []
  const objectives: string[] = []
  // Match section heading (## or ###) with "Learning Objectives" (case-insensitive, optional colon)
  const sectionRegex = /^#{2,3}\s*Learning\s+Objectives\s*:?\s*$/im
  const idx = content.search(sectionRegex)
  if (idx === -1) return []
  const afterHeading = content.slice(idx)
  // Find next ## or ### heading (start of next section) to bound the list
  const nextSectionMatch = afterHeading.slice(1).match(/\n\s*#{2,3}\s+/)
  const listBlock = nextSectionMatch
    ? afterHeading.slice(0, afterHeading.indexOf(nextSectionMatch[0]) + 1)
    : afterHeading
  // Match lines that are numbered (1. 2. 3.) or bullets (- or *)
  const lineRegex = /^\s*(?:\d+\.|\*|-)\s+(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = lineRegex.exec(listBlock)) !== null) {
    const text = match[1].trim()
    if (text.length > 2) objectives.push(text)
  }
  return objectives
}

/**
 * Extract the first complete JSON object from text (brace-matched, skips content inside strings).
 * Handles LLM responses that include trailing text or extra markdown after the JSON.
 */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escape) {
      escape = false
      continue
    }
    if (c === '\\' && inString) {
      escape = true
      continue
    }
    if (!inString) {
      if (c === '"') {
        inString = true
        continue
      }
      if (c === '{') {
        depth++
        continue
      }
      if (c === '}') {
        depth--
        if (depth === 0) return text.slice(start, i + 1)
        continue
      }
      continue
    }
    if (c === '"') inString = false
  }
  return null
}

/**
 * When JSON parse fails, try to salvage "content" and "title" from the raw response.
 * The AI often returns valid content but with unescaped newlines/quotes in the content field.
 */
function recoverLessonFromRawResponse(
  raw: string,
  fallbackTitle: string
): { content: string; title: string } | null {
  const clean = raw.trim().replace(/^```json?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  let content: string | null = null
  let title: string | null = null

  // Extract "title": "..." (usually one line)
  const titleMatch = clean.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)
  if (titleMatch) {
    title = titleMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim()
  }

  // Extract "content": " ... " by finding the key and then reading until closing " followed by , or }
  const contentKey = '"content"'
  const keyIdx = clean.indexOf(contentKey)
  if (keyIdx === -1) return null

  const afterKey = clean.slice(keyIdx + contentKey.length)
  const valueMatch = afterKey.match(/\s*:\s*"/)
  if (!valueMatch || valueMatch.index === undefined) return null

  const start = keyIdx + contentKey.length + valueMatch.index + valueMatch[0].length // first char after opening "
  let out = ''
  let i = start
  while (i < clean.length) {
    const c = clean[i]
    if (c === '\\') {
      if (i + 1 < clean.length) {
        const next = clean[i + 1]
        if (next === 'n') out += '\n'
        else if (next === 't') out += '\t'
        else if (next === '"') out += '"'
        else out += next
        i++
      }
      i++
      continue
    }
    if (c === '"') {
      const rest = clean.slice(i + 1).trimStart()
      if (rest.startsWith(',') || rest.startsWith('}')) {
        content = out.trim()
        break
      }
      out += c
      i++
      continue
    }
    out += c
    i++
  }

  if (!content || content.length < 20) return null
  return { content, title: title ?? fallbackTitle }
}

// Safe JSON parse with fallback; when parse fails, try to recover content from raw response
function safeJsonParse<T extends GeneratedLesson>(text: string, fallback: T): T {
  try {
    let cleanText = text.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7)
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3)
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3)
    }
    cleanText = cleanText.trim()

    // Prefer first complete JSON object (avoids "Unexpected non-whitespace after JSON" from trailing text)
    const extracted = extractFirstJsonObject(cleanText)
    if (extracted) {
      return JSON.parse(extracted) as T
    }

    // Fallback: find JSON object/array by regex if not already pure JSON
    if (!cleanText.startsWith('{') && !cleanText.startsWith('[')) {
      const jsonMatch = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
      if (jsonMatch) {
        cleanText = jsonMatch[1]
      }
    }

    return JSON.parse(cleanText) as T
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[Lesson Generator] Failed to parse JSON response:', errorMsg)
    console.error('[Lesson Generator] Response preview (first 500 chars):', text.substring(0, 500))

    const recovered = recoverLessonFromRawResponse(text, fallback.title)
    if (recovered && recovered.content.length > 0) {
      console.warn('[Lesson Generator] Recovered content from raw response (' + recovered.content.length + ' chars)')
      return {
        ...fallback,
        title: recovered.title,
        content: recovered.content,
      } as T
    }

    console.warn('[Lesson Generator] Using fallback lesson structure')
    return fallback
  }
}

function isMiniTestLowQuality(items: GeneratedLesson['mini_test'], fallbackQuestion: string): boolean {
  if (!Array.isArray(items) || items.length === 0) return true
  const trimmedQuestions = items.map((q) => q.question?.trim().toLowerCase()).filter(Boolean)
  if (trimmedQuestions.length === 0) return true

  const uniqueQuestions = new Set(trimmedQuestions)
  if (uniqueQuestions.size < Math.max(2, Math.floor(trimmedQuestions.length * 0.6))) return true

  const fallbackNormalized = fallbackQuestion.trim().toLowerCase()
  const fallbackCount = trimmedQuestions.filter((q) => q === fallbackNormalized).length
  if (fallbackCount >= Math.ceil(trimmedQuestions.length / 2)) return true

  const genericOptionsCount = items.filter((q) => {
    const opts = q.options || []
    return opts.every((opt) => /^option\s+[a-d]$/i.test(String(opt).trim()))
  }).length
  if (genericOptionsCount >= Math.ceil(items.length / 2)) return true

  return false
}

function dedupeMiniTest(items: GeneratedLesson['mini_test']): GeneratedLesson['mini_test'] {
  const seen = new Set<string>()
  const out: GeneratedLesson['mini_test'] = []
  for (const item of items) {
    const key = String(item.question || '').trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

async function regenerateMiniTestFromContent(
  topic: string,
  lessonContent: string,
  targetLanguage: string,
  count: number
): Promise<GeneratedLesson['mini_test']> {
  const prompt = `Create exactly ${count} high-quality multiple-choice questions for this lesson.
Rules:
- Output ONLY valid JSON.
- Language: ${targetLanguage}.
- Each question must test understanding of actual lesson content, not generic trivia.
- Provide exactly 4 plausible options.
- Exactly one correct answer per question.
- explanations must be concise and content-grounded.
- The mini_test array MUST contain exactly ${count} items (no fewer, no more).

Return JSON with exact shape:
{
  "mini_test": [
    { "question": "string", "options": ["A","B","C","D"], "correct_answer": 0, "explanation": "string" }
  ]
}

Topic: ${topic}
Lesson content:
${lessonContent.substring(0, 12000)}`

  const response = await generateLessonModelText(
    prompt,
    `You are an expert assessment designer. Create classroom-quality multiple-choice questions.
All output must be in ${targetLanguage}. Questions must be grounded in the provided lesson content.`
  )
  const text = response.text || '{}'
  const extracted = extractFirstJsonObject(text) || text
  let candidate: unknown = []
  try {
    const parsed = JSON.parse(extracted) as { mini_test?: unknown }
    candidate = parsed.mini_test
  } catch {
    candidate = []
  }
  const validated = z.object({ mini_test: z.array(miniTestItemSchema).min(1) }).safeParse({ mini_test: candidate })
  if (!validated.success) return []
  return validated.data.mini_test
}

// Default system instruction for lesson generation (used for both course and API/in-app; keep output style universal)
const LESSON_SYSTEM_INSTRUCTION = `You are an expert educational content creator. Your lessons should be:
- Clear and easy to understand
- Well-organized with proper sections
- Include a mini test to reinforce learning
- Professional and educational in tone
- Ground content in provided source material when supplied; otherwise use accurate general knowledge

Never add disclaimers or meta-commentary in the lesson content (e.g. "impossible to create", "based ONLY on the provided material", "content below will summarize"). Output only the lesson itself. Use consistent markdown: ## and ### for headings, **bold** for emphasis, simple bullet or numbered lists. Your task is to create comprehensive, engaging lessons that help students learn effectively.
For mini-test explanations, write directly and professionally. Do NOT use source-referencing filler like "According to the text...", "The text states...", "Mətndə ... qeyd olunur ki", or similar intros in any language.

Important: Write the "content" field in plain markdown only. Do not include raw HTML (e.g. no <sub>, <sup>, <div>). For subscripts use a_n or a_{n} in text; for superscripts use x^2 or x^{2}. Do not paste JSON objects or code blocks inside the lesson content.`


/** Map grade_level values (e.g. 'grade_9', 'undergraduate') to human-readable descriptions for AI prompts. */
function gradeValueToLabel(grade?: string): string | null {
  if (!grade) return null
  const map: Record<string, string> = {
    grade_1: 'Grade 1 (ages 6-7)', grade_2: 'Grade 2 (ages 7-8)', grade_3: 'Grade 3 (ages 8-9)',
    grade_4: 'Grade 4 (ages 9-10)', grade_5: 'Grade 5 (ages 10-11)', grade_6: 'Grade 6 (ages 11-12)',
    grade_7: 'Grade 7 (ages 12-13)', grade_8: 'Grade 8 (ages 13-14)', grade_9: 'Grade 9 (ages 14-15)',
    grade_10: 'Grade 10 (ages 15-16)', grade_11: 'Grade 11 (ages 16-17)', grade_12: 'Grade 12 (ages 17-18)',
    undergraduate: 'Undergraduate (university)', graduate: 'Graduate (master\'s level)', phd: 'PhD (doctoral level)',
  }
  return map[grade] ?? grade
}

/**
 * Generate a comprehensive lesson using RAG
 * @param documentId - The primary source document ID (used for DB and when documentIds not provided)
 * @param topic - The lesson topic
 * @param userId - The user ID
 * @param language - Target language for the lesson
 * @param includeImages - Whether to generate images
 * @param lessonId - Optional lesson ID for saving images to storage
 * @param contentOptions - Optional: tables, figures, charts, content length (for UI/API/course)
 * @param documentIds - Optional: when provided, RAG uses all these documents; primary document_id in DB is documentIds[0] or documentId
 * @param objectives - Optional: teacher-provided learning objectives to guide the lesson
 * @param gradeLevel - Optional: target grade level (e.g. 'grade_9', 'undergraduate')
 * @param corePrompt - Optional: teacher-provided core instruction for scope/style/focus
 */
export async function generateLesson(
  documentId: string | null,
  topic: string,
  userId: string,
  language?: string,
  includeImages: boolean = true,
  lessonId?: string,
  contentOptions?: LessonGenerationContentOptions,
  documentIds?: string[],
  objectives?: string,
  gradeLevel?: string,
  corePrompt?: string
): Promise<GeneratedLesson> {
  // Ensure topic is a string (it may come as an object from AI-generated course structure)
  let topicString: string
  if (typeof topic === 'string') {
    topicString = topic
  } else if (topic && typeof topic === 'object') {
    const obj = topic as Record<string, unknown>
    topicString = (obj.title as string) || (obj.name as string) || (obj.topic as string) || JSON.stringify(topic)
  } else {
    topicString = String(topic || 'General topic')
  }

  let context = ''
  let usingDocumentContext = false
  const idsForRag = documentIds && documentIds.length > 0
    ? documentIds
    : documentId
      ? [documentId]
      : []

  if (idsForRag.length === 0) {
    throw new Error('At least one source document is required')
  }

  if (idsForRag.length > 1) {
    const retrieved = await getRelevantContentFromDocuments(idsForRag, userId, topicString, 7)
    if (!retrieved || retrieved.trim().length === 0) {
      throw new Error('No relevant content found from the selected documents for this topic')
    }
    usingDocumentContext = true
    context = retrieved
      .split(/\n\n---\n\n/)
      .map((chunk: string, idx: number) => `[Section ${idx + 1}]\n${chunk}`)
      .join('\n\n---\n\n')
  } else if (idsForRag.length === 1) {
    const primaryId = idsForRag[0]
    let documentText: string | null
    try {
      documentText = await getParsedDocumentText(primaryId, userId, false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to get document text:', errorMessage)
      throw new Error(`Failed to process document: ${errorMessage}`)
    }
    if (!documentText) {
      throw new Error("Document not found or you don't have access to it")
    }
    const relevantChunks = await getRelevantChunks(primaryId, documentText, topicString, 7)
    if (relevantChunks.length === 0) {
      throw new Error('No relevant content found in the selected document for this topic')
    }
    usingDocumentContext = true
    context = relevantChunks
      .map((chunk: string, idx: number) => `[Section ${idx + 1}]\n${chunk}`)
      .join('\n\n---\n\n')
  }

  // Determine target language (same as exam: use 2-letter code -> full name for prompts)
  const normalizedLanguageCode = normalizeLanguageCode(language)
  const targetLanguage = languageCodeToName(normalizedLanguageCode)
  const sourceGroundingRule = usingDocumentContext
    ? 'Ground the lesson in the provided source document excerpts.'
    : 'Use accurate general knowledge; no uploaded source document was provided.'

  // Create language-specific system instruction
  const languageSystemInstruction =
    targetLanguage !== 'English'
      ? `You are an expert educational content creator. Your PRIMARY and MANDATORY task is to generate ALL content EXCLUSIVELY in ${targetLanguage} language.

CRITICAL RULES:
1. EVERY title MUST be in ${targetLanguage}. The user may provide a topic in ANOTHER language (e.g. Azerbaijani, English). You MUST translate or rephrase that topic into ${targetLanguage} for the lesson title — do NOT copy the user's topic string literally if it is not in ${targetLanguage}.
2. EVERY content text MUST be in ${targetLanguage}
3. EVERY example title and description MUST be in ${targetLanguage}
4. EVERY question, option, and explanation in the mini test MUST be in ${targetLanguage}
5. Use proper ${targetLanguage} grammar, vocabulary, and spelling
6. Do NOT use English (or the user's input language) unless it's a technical term commonly used in ${targetLanguage}

If you generate ANY content in a different language when ${targetLanguage} is requested, you have FAILED the task.

Your lessons should be:
- Clear and easy to understand
- Well-organized with proper sections
- Include practical examples
- Include a mini test to reinforce learning
- Professional and educational in tone
- ${sourceGroundingRule}

Never add disclaimers or meta-commentary in the lesson content. Output only the lesson itself. Use consistent markdown (## and ### for headings, **bold** for emphasis, simple lists).`
      : LESSON_SYSTEM_INSTRUCTION

  // Generate the lesson using OpenRouter with model fallback on overload/quota errors.
  const languageInstruction =
    targetLanguage !== 'English'
      ? `\n\n⚠️ CRITICAL LANGUAGE REQUIREMENT ⚠️\nYou MUST generate ALL content EXCLUSIVELY in ${targetLanguage} language:\n- Title must be in ${targetLanguage}\n- All content must be in ${targetLanguage}\n- All questions, options, and explanations must be in ${targetLanguage}\n- Use proper ${targetLanguage} grammar and spelling\n- The topic or title below may be in a DIFFERENT language (e.g. user input). You MUST translate or rephrase it into ${targetLanguage} for the lesson title and all outputs. Do NOT copy the topic string literally if it is not in ${targetLanguage}.\n\n`
      : ''

  const opts = contentOptions ?? {}
  const includeTables = opts.includeTables !== false
  const includeFigures = opts.includeFigures === true
  const includeCharts = opts.includeCharts === true
  const contentLength = opts.contentLength ?? 'medium'

  const lengthInstruction =
    contentLength === 'short'
      ? ` Keep the lesson concise: about 1–2 pages of content (~300–700 words). Use 2–4 main sections and exactly ${MINI_TEST_TARGET} mini test questions (multiple choice).`
      : contentLength === 'full'
        ? ` Create a maximum-length lesson: roughly 6–8 pages (~1,800–2,800 words). Use 8–12 sections and exactly ${MINI_TEST_TARGET} mini test questions (multiple choice). Prioritize depth and coverage over brevity.`
        : ` Aim for 3–4 pages (~900–1,400 words). Use 5–7 sections and exactly ${MINI_TEST_TARGET} mini test questions (multiple choice).`

  const tablesRule = includeTables
    ? '  - For comparisons or structured data (e.g. definitions, properties, before/after), use markdown tables: one header row with | Column A | Column B |, then a separator row | --- | --- |, then data rows. Tables render clearly in the lesson and in the AI tutor chat.'
    : '  - Prefer short paragraphs and lists over tables; use tables only if essential.'

  const figuresRule = includeFigures
    ? '\n- Include 1–2 key figures or diagrams in the content: describe them clearly (e.g. "Figure 1: Diagram showing...") so they can be illustrated. Place each figure description after the relevant section.'
    : ''

  const chartsRule = includeCharts
    ? '\n- Where helpful, include chart-like data: use markdown tables for trends or comparisons, or a short description of what a chart would show (e.g. "A bar chart of X would show...").'
    : ''

  const imagesVisualRule = includeImages
    ? '\n- This lesson will receive separate AI-generated images in the app. Do NOT replace figures with enormous markdown tables or rows made of very long runs of dashes and pipes. For each visual, use a short heading like "### Şəkil 1: …" / "### Figure 1: …" (match the lesson language) followed by a compact bullet list — not a wide table. If you use a markdown table, keep it small: at most ~6 columns, short cell text, and separator rows must look exactly like | --- | --- | (same pipe count as the header) — never stretch a cell with hundreds of dashes.'
    : ''

  const rawGradeLevel = typeof gradeLevel === 'string' ? gradeLevel.trim() : ''
  const gradeLevelLabel = gradeValueToLabel(rawGradeLevel)
  const targetGradeLevel = gradeLevelLabel ?? rawGradeLevel
  const gradeInstruction = targetGradeLevel
    ? `\n\n🎓 TARGET GRADE LEVEL: ${targetGradeLevel}\nYou MUST tailor the lesson for this grade level:\n- Use vocabulary and sentence complexity appropriate for ${targetGradeLevel} students\n- Adjust the depth of explanation: simpler for lower grades, more analytical for higher levels\n- The mini test difficulty must match this grade level\n`
    : ''

  const objectivesInstruction = objectives
    ? `\n\n🎯 TEACHER-PROVIDED LEARNING OBJECTIVES (use these exactly):\n${objectives}\nYou MUST structure the lesson content to cover ALL of the above objectives. Use them as the "learning_objectives" array in your response (you may rephrase slightly for clarity but preserve the intent). The lesson content and mini test questions should directly support these objectives.\n`
    : ''
  const corePromptInstruction = corePrompt?.trim()
    ? `\n\n🧭 CORE TEACHER PROMPT (high priority):\n${corePrompt.trim()}\nUse this as a strict guidance layer for scope, tone, depth, style, and constraints.`
    : ''

  const lessonIntro = usingDocumentContext
    ? `Create a comprehensive lesson about "${topicString}" based on the source material below.`
    : `Create a comprehensive lesson about "${topicString}" using sound educational knowledge (no uploaded source document).`
  const sourceSectionLabel = usingDocumentContext ? 'Source material' : 'Guidance'

  const prompt = `${languageInstruction}${lessonIntro}${lengthInstruction}${gradeInstruction}${objectivesInstruction}${corePromptInstruction}

FORMATTING RULES (universal style – must follow):
- Output ONLY the lesson. Do NOT add disclaimers, meta-commentary, or phrases like "impossible to create", "based ONLY on the provided material", "content below will summarize the PDF", or "(from provided PDF)" in headings or text.
- If source material does not fully cover the topic, still produce a clear, self-contained lesson; do not explain limitations to the user in the content.
- Mini-test explanations must be direct and student-facing. Do NOT start with source-referencing filler like "According to the text...", "The text states...", "Mətndə ... qeyd olunur ki", "В тексте сказано...", etc.
- Use clean, consistent markdown in the "content" field:
  - Use ## for main section headings and ### for subsections. No extra labels like "(from provided PDF)" in headings.
  - Use **text** for bold (never ***text:** or similar). Use *text* for italic.
  - Use simple bullet lists with * or - at the start of each line. Do not duplicate the same bullet as a sub-bullet; keep a single-level list unless you have real sub-items.
  - Use numbered lists (1. 2. 3.) for steps or ordered points.
${tablesRule}${figuresRule}${chartsRule}${imagesVisualRule}
- The "content" field must look like a clean, professional lesson suitable for in-app display: clear headings, short paragraphs, well-structured lists${includeTables ? ', and tables when they aid understanding' : ''}.
- CRITICAL: Do NOT put the mini test inside the "content" field. No "## Mini Test", quiz questions, A/B/C/D options, or answer keys in content. The app shows questions only from the separate "mini_test" JSON array (its own tab).

The lesson should be well-structured, educational, and include:
1. A clear title
2. ${objectives ? 'The learning objectives provided above (3-5 items)' : '3-5 specific learning objectives (what students will learn)'}
3. Main content explaining the topic in detail (using the markdown rules above) — teaching material ONLY
4. A mini test with exactly ${MINI_TEST_TARGET} questions (multiple choice) — ONLY in the "mini_test" array, never duplicated in "content"

Return ONLY a valid JSON object with this exact structure. You MUST include all fields; learning_objectives is REQUIRED and must be a non-empty array of 3-5 strings. Output "title" and "learning_objectives" first (before "content") so they are never omitted.
The mini_test array MUST contain exactly ${MINI_TEST_TARGET} question objects.
CRITICAL for valid JSON: In the "content" field use \\n for line breaks (do not use literal newlines inside the string). Escape any double-quote inside content as \\".
{
  "title": "Lesson title here",
  "learning_objectives": [
    "Students will understand...",
    "Students will be able to...",
    "Students will learn..."
  ],
  "content": "Main lesson content in markdown ONLY (no mini test). Use ## and ### for headings, **bold** for emphasis, simple * bullets or 1. 2. numbered lists, and markdown tables (| col | col |, then | --- | --- |, then rows) for comparisons. No disclaimers, meta-commentary, or quiz sections.",
  "mini_test": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

${sourceSectionLabel}:
${context}

Topic: ${topicString}

Generate the lesson now. Return ONLY the JSON object, no other text.`

  const fallback = getFallbackPhrases(normalizedLanguageCode)
  try {
    const structured = await generateLessonStructuredJson(prompt, languageSystemInstruction)
    const text = structured.text || '{}'
    const usageTelemetry: NonNullable<GeneratedLesson['usage']> = {
      input_tokens: structured.usage?.promptTokens ?? 0,
      output_tokens: structured.usage?.completionTokens ?? 0,
      prompt_tokens: structured.usage?.promptTokens ?? 0,
      completion_tokens: structured.usage?.completionTokens ?? 0,
      total_tokens: structured.usage?.totalTokens ?? 0,
      model_used: structured.modelUsed,
    }

    const lesson: GeneratedLesson = {
      title: typeof structured.lesson.title === 'string' && structured.lesson.title.trim()
        ? structured.lesson.title.trim()
        : fallback.title,
      content: typeof structured.lesson.content === 'string' ? structured.lesson.content : '',
      learning_objectives: Array.isArray(structured.lesson.learning_objectives)
        ? structured.lesson.learning_objectives
        : [],
      duration_minutes: 5,
      mini_test: Array.isArray(structured.lesson.mini_test) ? structured.lesson.mini_test : [],
      images: [],
    }

    // Ensure learning_objectives is an array
    if (!Array.isArray(lesson.learning_objectives)) {
      lesson.learning_objectives = []
    }
    // If missing (e.g. first lesson truncated, or AI skipped): recover from raw response then from content
    if (lesson.learning_objectives.length === 0) {
      const fromRaw = extractLearningObjectivesFromRawResponse(text)
      if (fromRaw.length > 0) {
        lesson.learning_objectives = fromRaw
      } else if (lesson.content) {
        const fromContent = extractLearningObjectivesFromContent(lesson.content)
        if (fromContent.length > 0) {
          lesson.learning_objectives = fromContent
        }
      }
    }

    // Normalize content to universal style (strip disclaimers, fix markdown) for consistent display in app and API
    lesson.content = normalizeLessonContent(lesson.content)

    // When JSON path yields placeholder/empty content, regenerate as plain markdown (more reliable for long lessons).
    if (isPlaceholderLessonContent(lesson.content)) {
      console.warn('[Lesson Generator] Placeholder/empty content after JSON path — regenerating as markdown')
      try {
        const md = await generateLessonBodyMarkdown(
          topicString,
          context,
          targetLanguage,
          languageSystemInstruction,
          lengthInstruction,
          `${languageInstruction}${gradeInstruction}${objectivesInstruction}${corePromptInstruction}`
        )
        if (!isPlaceholderLessonContent(md.content)) {
          lesson.title = md.title || lesson.title
          lesson.content = normalizeLessonContent(md.content)
          if (md.learning_objectives.length > 0) {
            lesson.learning_objectives = md.learning_objectives
          }
          usageTelemetry.input_tokens += md.usage?.promptTokens ?? 0
          usageTelemetry.output_tokens += md.usage?.completionTokens ?? 0
          usageTelemetry.prompt_tokens += md.usage?.promptTokens ?? 0
          usageTelemetry.completion_tokens += md.usage?.completionTokens ?? 0
          usageTelemetry.total_tokens += md.usage?.totalTokens ?? 0
          if (md.modelUsed) usageTelemetry.model_used = md.modelUsed
        }
      } catch (error) {
        console.warn('[Lesson Generator] Markdown body regeneration failed:', error)
      }
    }

    if (isPlaceholderLessonContent(lesson.content)) {
      throw new Error(
        'Lesson content generation failed (empty or placeholder body). Please try again with a shorter content length or fewer source documents.'
      )
    }

    // Estimated reading time from content length (avg 200 words per minute); mini-test time added after mini_test is finalized
    const wordCount = lesson.content.split(/\s+/).length
    const readingMinutes = Math.ceil(wordCount / 200)

    if (!lesson.mini_test || lesson.mini_test.length === 0) {
      lesson.mini_test = []
    }

    if (isMiniTestLowQuality(lesson.mini_test, fallback.question) || lesson.mini_test.length < MINI_TEST_TARGET) {
      try {
        const regenerated = await regenerateMiniTestFromContent(
          topicString,
          lesson.content,
          targetLanguage,
          MINI_TEST_TARGET
        )
        if (regenerated.length > 0) {
          lesson.mini_test = dedupeMiniTest(regenerated)
        }
      } catch (error) {
        console.warn('Mini-test regeneration failed, using current mini-test:', error)
      }
    }

    // If still short, request only the missing amount and merge (no placeholder questions).
    if (lesson.mini_test.length < MINI_TEST_TARGET) {
      try {
        const missing = MINI_TEST_TARGET - lesson.mini_test.length
        const topUp = await regenerateMiniTestFromContent(
          topicString,
          lesson.content,
          targetLanguage,
          missing
        )
        if (topUp.length > 0) {
          lesson.mini_test = dedupeMiniTest([...lesson.mini_test, ...topUp]).slice(0, MINI_TEST_TARGET)
        }
      } catch (error) {
        console.warn('Mini-test top-up failed, keeping available questions:', error)
      }
    }

    // Never return generic placeholder entries.
    lesson.mini_test = lesson.mini_test.filter((q) => {
      const question = String(q.question || '').trim().toLowerCase()
      const options = Array.isArray(q.options) ? q.options.map((opt) => String(opt).trim().toLowerCase()) : []
      const genericOptions = options.length === 4 && options.every((opt, i) => opt === `option ${String.fromCharCode(97 + i)}` || opt === `${String.fromCharCode(65 + i)} variantı`.toLowerCase())
      return question !== fallback.question.trim().toLowerCase() && !genericOptions
    })

    // Filtering can drop count; top up again (max a few attempts) toward MINI_TEST_TARGET.
    let topUpAttempts = 0
    while (lesson.mini_test.length < MINI_TEST_TARGET && topUpAttempts < 3) {
      topUpAttempts += 1
      try {
        const missing = MINI_TEST_TARGET - lesson.mini_test.length
        const topUp = await regenerateMiniTestFromContent(
          topicString,
          lesson.content,
          targetLanguage,
          missing
        )
        if (topUp.length > 0) {
          lesson.mini_test = dedupeMiniTest([...lesson.mini_test, ...topUp]).slice(0, MINI_TEST_TARGET)
        } else {
          break
        }
        lesson.mini_test = lesson.mini_test.filter((q) => {
          const question = String(q.question || '').trim().toLowerCase()
          const options = Array.isArray(q.options) ? q.options.map((opt) => String(opt).trim().toLowerCase()) : []
          const genericOptions =
            options.length === 4 &&
            options.every(
              (opt, i) =>
                opt === `option ${String.fromCharCode(97 + i)}` || opt === `${String.fromCharCode(65 + i)} variantı`.toLowerCase()
            )
          return question !== fallback.question.trim().toLowerCase() && !genericOptions
        })
      } catch (error) {
        console.warn('Mini-test post-filter top-up failed:', error)
        break
      }
    }

    lesson.mini_test = lesson.mini_test.slice(0, MINI_TEST_TARGET)

    // Post-process mini-test explanations to remove low-value source-referencing intros.
    lesson.mini_test = lesson.mini_test.map((item) => ({
      ...item,
      explanation: sanitizeExplanation(item.explanation) || fallback.explanation,
    }))

    // Skip full-lesson JSON re-translation. Primary prompts already enforce target language;
    // a second JSON round-trip often truncates/corrupts long markdown content (empty lesson body).

    if (lesson.mini_test.length > MINI_TEST_TARGET) {
      lesson.mini_test = lesson.mini_test.slice(0, MINI_TEST_TARGET)
    }
    const testTimeFinal = Math.ceil((lesson.mini_test?.length || 0) * 0.5)
    lesson.duration_minutes = Math.max(5, readingMinutes + testTimeFinal)

    // Generate images for the lesson (2-3 images) with language context
    // If lessonId is provided, images will be saved to Supabase Storage
    if (includeImages) {
      try {
        const effectiveLessonId = lessonId ?? randomUUID()
        const imageResult = await generateLessonImagesWithUsage(
          topicString,
          lesson.content,
          3,
          normalizedLanguageCode,
          effectiveLessonId
        )
        lesson.images = imageResult.images
        usageTelemetry.image_prompt_tokens = imageResult.usage.prompt_tokens
        usageTelemetry.image_completion_tokens = imageResult.usage.completion_tokens
        usageTelemetry.image_total_tokens = imageResult.usage.total_tokens
        usageTelemetry.image_model_used = imageResult.usage.model_used
      } catch (error) {
        console.error('Error generating images for lesson:', error)
        // Continue without images if generation fails
        lesson.images = []
      }
    } else {
      lesson.images = []
    }

    lesson.usage = usageTelemetry

    return lesson
  } catch (error) {
    console.error('Error generating lesson:', error)
    throw new Error(
      error instanceof Error
        ? `Failed to generate lesson: ${error.message}`
        : 'Failed to generate lesson. Please try again.'
    )
  }
}

export class LessonAiService {
  constructor(private readonly app: FastifyInstance) {
    ragServiceRef = new DocumentRagService(app)
  }

  async generate(userId: string, input: unknown) {
    return runWithAiContext({ app: this.app, userId }, async () => {
    currentRagUserId = userId
    const body = (input ?? {}) as {
      documentId?: string
      documentIds?: string[]
      topic?: string
      objectives?: string
      corePrompt?: string
      gradeLevel?: string
      language?: string
      options?: {
        includeImages?: boolean
        includeAudio?: boolean
        includeTables?: boolean
        includeFigures?: boolean
        includeCharts?: boolean
        contentLength?: 'short' | 'medium' | 'full'
      }
    }

    const topic = (body.topic || '').trim()
    if (!topic) {
      throw new Error('Topic is required')
    }

    const documentIds = Array.isArray(body.documentIds)
      ? body.documentIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : []
    const mergedDocumentIds = Array.from(
      new Set([...(documentIds || []), ...(body.documentId ? [body.documentId] : [])])
    )
    const MAX_LESSON_DOCUMENTS = 5
    const primaryDocumentId = mergedDocumentIds[0] ?? null
    if (mergedDocumentIds.length === 0) {
      const err = new Error('At least one source document is required') as Error & { statusCode?: number }
      err.statusCode = 400
      throw err
    }
    if (mergedDocumentIds.length > MAX_LESSON_DOCUMENTS) {
      const err = new Error(`Maximum ${MAX_LESSON_DOCUMENTS} source documents allowed`) as Error & {
        statusCode?: number
      }
      err.statusCode = 400
      throw err
    }

    const opts = body.options || {}
    const includeImages = opts.includeImages !== false
    const includeAudio = opts.includeAudio !== false

    const lessonId = randomUUID()
    let generated: GeneratedLesson
    try {
      // Images are generated after DB insert (same as audio) so the HTTP response returns before image API calls.
      generated = await generateLesson(
        primaryDocumentId,
        topic,
        userId,
        body.language,
        false,
        lessonId,
        {
          includeTables: opts.includeTables !== false,
          includeFigures: opts.includeFigures === true,
          includeCharts: opts.includeCharts === true,
          contentLength: opts.contentLength ?? 'medium',
        },
        mergedDocumentIds.length > 0 ? mergedDocumentIds : undefined,
        body.objectives?.trim() || undefined,
        body.gradeLevel || undefined,
        body.corePrompt?.trim() || undefined
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const wrapped = new Error(`Lesson generation failed: ${message}`) as Error & { statusCode?: number }
      wrapped.statusCode = 500
      throw wrapped
    }

    try {
      await this.app.db.query(
        `INSERT INTO lessons (id, user_id, document_id, title, description, grade_level, topic, duration_minutes, content, learning_objectives, mini_test, images, metadata, language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14)`,
        [
          lessonId,
          userId,
          primaryDocumentId,
          generated.title,
          `AI-generated lesson: ${generated.title}`,
          body.gradeLevel || null,
          topic,
          generated.duration_minutes || 10,
          JSON.stringify({ text: generated.content }),
          JSON.stringify(generated.learning_objectives || []),
          JSON.stringify(generated.mini_test || []),
          JSON.stringify(generated.images || []),
          JSON.stringify({
            generation_options: {
              includeImages,
              includeAudio,
              includeTables: opts.includeTables !== false,
              includeFigures: opts.includeFigures === true,
              includeCharts: opts.includeCharts === true,
              contentLength: opts.contentLength ?? 'medium',
            },
            source_documents: mergedDocumentIds,
            usage: generated.usage || null,
            core_prompt: body.corePrompt || null,
            custom_objectives: body.objectives || null,
            images_pending: includeImages,
            audio_failed: false,
          }),
          (body.language || 'en').trim().toLowerCase() || 'en',
        ]
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const wrapped = new Error(`Lesson save failed: ${message}`) as Error & { statusCode?: number }
      wrapped.statusCode = 500
      throw wrapped
    }

    if (includeImages) {
      void (async () => {
        try {
          const imageResult = await runWithAiContext({ app: this.app, userId }, () =>
            generateLessonImagesWithUsage(topic, generated.content, 3, body.language, lessonId)
          )
          await this.app.db.query(
            `UPDATE lessons
             SET images = $2::jsonb,
                 metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
                 updated_at = now()
             WHERE id = $1`,
            [
              lessonId,
              JSON.stringify(imageResult.images),
              JSON.stringify({
                image_usage: imageResult.usage,
                images_pending: false,
                images_failed: !imageResult.images?.length,
              }),
            ]
          )
        } catch (error) {
          this.app.log.warn({ error, lessonId }, 'Lesson image generation failed')
          try {
            await this.app.db.query(
              `UPDATE lessons
               SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                   updated_at = now()
               WHERE id = $1`,
              [lessonId, JSON.stringify({ images_pending: false, images_failed: true })]
            )
          } catch {
            // ignore metadata update failure
          }
        }
      })()
    }

    if (includeAudio) {
      void (async () => {
        try {
          const tts = await runWithAiContext({ app: this.app, userId }, () =>
            generateLessonAudioWithUsage(lessonId, generated.title, generated.content, body.language)
          )
          if (!tts.audioUrl) {
            await this.app.db.query(
              `UPDATE lessons
               SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                   updated_at = now()
               WHERE id = $1`,
              [lessonId, JSON.stringify({ audio_failed: true, tts_usage: tts.usage })]
            )
            return
          }
          await this.app.db.query(
            `UPDATE lessons
             SET audio_url = $2,
                 metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
                 updated_at = now()
             WHERE id = $1`,
            [
              lessonId,
              tts.audioUrl,
              JSON.stringify({ audio_url: tts.audioUrl, audio_failed: false, tts_usage: tts.usage }),
            ]
          )
        } catch (error) {
          this.app.log.warn({ error, lessonId }, 'Lesson TTS generation failed')
          try {
            await this.app.db.query(
              `UPDATE lessons
               SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
                   updated_at = now()
               WHERE id = $1`,
              [lessonId, JSON.stringify({ audio_failed: true })]
            )
          } catch {
            // ignore metadata update failure
          }
        }
      })()
    }

    return {
      id: lessonId,
      ...generated,
      audio_url: null as string | null,
    }
    })
  }
}

// Export the original lessonGenerator for backward compatibility
export const lessonGenerator = {
  generateLesson,
  createLesson: async (_params: {
    topic: string
    gradeLevel: string
    durationMinutes: number
    learningObjectives?: string[]
    teachingStyle?: 'traditional' | 'inquiry_based' | 'project_based' | 'flipped'
    includeActivities?: boolean
    includeAssessment?: boolean
    language?: string
    customInstructions?: string
  }) => {
    // This is a simplified version for backward compatibility
    // In production, this would need a document to work with
    throw new Error('Please use generateLesson with a document ID for RAG-based generation')
  },
}

export type { GeneratedLesson as GenerateLessonResult }
