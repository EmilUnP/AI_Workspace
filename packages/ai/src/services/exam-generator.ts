import { generateContent } from '../gemini'
import { getRelevantContentFromDocuments } from './document-rag'
import { getLanguageNameForPrompt } from '@eduator/config/constants'

export type QuestionType = 'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank'
export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface QuestionTypeDistribution {
  multiple_choice: number
  true_false: number
  multiple_select: number
  fill_blank: number
}

export interface DifficultyDistribution {
  easy: number
  medium: number
  hard: number
}

export interface DocumentMetaForRag {
  id: string
  title: string
  file_type?: string | null
}

/** Raw question shape from AI JSON; fields optional. AI may return "question" or "text", "correct_answer" or "correctAnswer". */
export interface RawQuestionFromAi {
  type?: string
  text?: string
  question?: string
  options?: unknown[]
  correctAnswer?: unknown
  correct_answer?: unknown
  explanation?: unknown
  difficulty?: unknown
  topics?: unknown[]
}

export interface GeneratedQuestion {
  id: string
  type: QuestionType
  text: string
  options: string[]
  correctAnswer: string | string[]
  explanation?: string
  difficulty?: DifficultyLevel
  topics?: string[]
}

export interface GenerateExamQuestionsInput {
  documentIds?: string[]
  /** Used by RAG to scope access and embeddings */
  userId: string
  /** Optional document metadata (used for fallback context) */
  documents?: DocumentMetaForRag[]
  questionCount: number
  difficulty: DifficultyLevel | 'mixed'
  language: string
  /** Topic list from UI. Accepts array (preferred) or comma-separated string (legacy). */
  topics?: string | string[]
  /** Optional per-topic counts (same order as parsed topics) */
  topicQuestionCounts?: (number | string | undefined)[]
  customPrompt?: string
  questionTypes?: QuestionTypeDistribution
  difficultyLevels?: DifficultyDistribution
  /** Override default batching; defaults to 20 */
  batchSize?: number
  /** Override chunks per document; defaults to 10 when multiple topics else 5 */
  chunksPerDoc?: number
}

/** Strict quality rules so questions are self-contained and professional. Injected into every generation prompt. */
const EXAM_QUALITY_RULES = `
## CRITICAL QUALITY RULES (MUST FOLLOW - UNPROFESSIONAL TO VIOLATE):

1. **NEVER reference page numbers.** Do not write "on page 17", "на странице 17", "see page X", or any page/slide number. The student does not see pages; such references are wrong and unprofessional.

2. **NEVER reference section/chapter/topic names inside the question text.** Do not write "in the Introduction", "во ВВЕДЕНИИ", "according to section X", or use topic/section titles as if the student sees them. Questions must be self-contained. Use the topic only for metadata/tagging, not inside the question wording.

3. **NEVER refer to content the student cannot see.** Do not ask about "the table below", "the figure", "the diagram", "the chart", "the infographic", or "согласно таблице" unless you include the full relevant information in the question text itself. If the source has a table/figure, either state the needed facts directly in the question stem so the student can answer without seeing it, or do not ask about that content. Every question must be answerable from the text of the question and options alone.

4. **Write like a professional assessment.** Use clear, human, natural language. Avoid awkward phrasing, meta-references to the document, or examiner-only jargon. Questions should feel like they were written by an experienced teacher for a real exam.

5. **Write explanations directly; avoid source-referencing filler.** Do NOT start explanations with phrases like "According to the text...", "The text states...", "Mətndə ... qeyd olunur ki", "В тексте сказано...", or similar in any language. Start with the concept/fact itself and explain why the answer is correct in a concise, student-facing way.
`

/** Exact JSON output format so the model returns "text" (question body) and correct field names. */
const EXAM_JSON_SCHEMA = `
## OUTPUT FORMAT (STRICT - use these exact field names):
Return a JSON array only. Each object MUST have:
- "text": string (REQUIRED - the full question stem that the student reads; do NOT use "question" or leave it empty)
- "type": "multiple_choice" | "true_false" | "multiple_select" | "fill_blank"
- "options": string[] — For multiple_choice and multiple_select: exactly 4 options (A–D). For true_false: exactly 2 options, e.g. ["Верно","Неверно"] or ["True","False"]. Never use 5 or more options.
- "correctAnswer": string or string[] (for multiple_select use array of correct option strings; for true_false use "Верно" or "Неверно" or "True"/"False" to match options)
- "explanation": string (why the answer is correct)
- "difficulty": "easy" | "medium" | "hard"
- "topics": string[] (as instructed above)

Example single item: {"text":"Какой процесс обеспечивает поступление веществ в клетку?","type":"multiple_choice","options":["Диффузия","Осмос","Пиноцитоз","Все перечисленное"],"correctAnswer":"Все перечисленное","explanation":"...","difficulty":"medium","topics":["..."]}
`

/** Cap context length so prompts stay reasonable and Gemini responds faster. */
const MAX_CONTEXT_CHARS = 12_000
const GEMINI_BATCH_TIMEOUT_MS = 120_000

function capContext(text: string, maxChars: number = MAX_CONTEXT_CHARS): string {
  if (!text || text.length <= maxChars) return text
  return text.slice(0, maxChars) + '\n\n[... content truncated for length ...]'
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    if (!text || text.trim().length === 0) return fallback

    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim()

    let cleanedJson = jsonStr
    if (!cleanedJson.startsWith('{') && !cleanedJson.startsWith('[')) {
      const jsonObjectMatch = cleanedJson.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
      if (jsonObjectMatch) cleanedJson = jsonObjectMatch[1]
    }

    return JSON.parse(cleanedJson) as T
  } catch {
    // Best effort: try to parse extracted JSON-like content
    try {
      const jsonLikeMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/)
      if (jsonLikeMatch) return JSON.parse(jsonLikeMatch[1]) as T
    } catch {
      // ignore
    }
    return fallback
  }
}

function toPositiveInt(n: unknown): number {
  const v = Math.floor(Number(n) || 0)
  return v > 0 ? v : 0
}

function parseTopicsInput(topics: GenerateExamQuestionsInput['topics']): string[] {
  if (Array.isArray(topics)) {
    return topics.map((t) => String(t).trim()).filter((t) => t.length > 0)
  }
  if (typeof topics === 'string' && topics.trim()) {
    return topics.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
  }
  return []
}

type GeminiUsage = {
  input_tokens: number
  output_tokens: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

async function callGemini(prompt: string): Promise<{ text: string; usage: GeminiUsage }> {
  const { text, tokensUsed, promptTokens, completionTokens, totalTokens } = await generateContent(prompt, {
    model: 'flash',
  })
  return {
    text,
    usage: {
      input_tokens: promptTokens ?? tokensUsed,
      output_tokens: completionTokens ?? 0,
      prompt_tokens: promptTokens ?? tokensUsed,
      completion_tokens: completionTokens ?? 0,
      total_tokens: totalTokens ?? tokensUsed,
    },
  }
}

/** Call Gemini with timeout and progress logging so long runs don't hang silently. */
async function callGeminiWithTimeout(
  prompt: string,
  logLabel: string
): Promise<{ text: string; usage: GeminiUsage }> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const t = setTimeout(() => {
      clearTimeout(t)
      reject(new Error(`Exam generation timed out after ${GEMINI_BATCH_TIMEOUT_MS / 1000}s. Try fewer questions or try again.`))
    }, GEMINI_BATCH_TIMEOUT_MS)
  })
  console.log(`[Exam] ${logLabel}: calling AI...`)
  const start = Date.now()
  try {
    const result = await Promise.race([callGemini(prompt), timeoutPromise])
    console.log(`[Exam] ${logLabel}: done in ${Math.round((Date.now() - start) / 1000)}s`)
    return result
  } catch (e) {
    console.error(`[Exam] ${logLabel}: failed after ${Math.round((Date.now() - start) / 1000)}s`, e)
    throw e
  }
}

/** Normalize raw type string from AI (may use spaces or different casing) to QuestionType. */
function normalizeType(raw: unknown): QuestionType {
  const s = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, '_')
  if (s === 'true_false' || s === 'truefalse') return 'true_false'
  if (s === 'multiple_choice' || s === 'multiplechoice') return 'multiple_choice'
  if (s === 'multiple_select' || s === 'multipleselect') return 'multiple_select'
  if (s === 'fill_blank' || s === 'fillblank') return 'fill_blank'
  return 'multiple_choice'
}

/** Detect if options look like a true/false pair so we can coerce type. */
function isTrueFalseOptions(options: string[]): boolean {
  if (options.length !== 2) return false
  const a = options[0].trim().toLowerCase()
  const b = options[1].trim().toLowerCase()
  return (
    (a === 'верно' && b === 'неверно') ||
    (a === 'неверно' && b === 'верно') ||
    (a === 'true' && b === 'false') ||
    (a === 'false' && b === 'true') ||
    (a === 'да' && b === 'нет') ||
    (a === 'нет' && b === 'да')
  )
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

function normalizeQuestions(
  raw: RawQuestionFromAi[],
  forcedTopic?: string
): GeneratedQuestion[] {
  const validDifficulties: DifficultyLevel[] = ['easy', 'medium', 'hard']

  return raw.map((q, index) => {
    const difficulty = validDifficulties.includes(String(q.difficulty) as DifficultyLevel)
      ? (String(q.difficulty) as DifficultyLevel)
      : 'medium'

    let type = normalizeType(q.type)
    let options = Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === 'string').map((o) => String(o).trim()) : []

    // If AI returned multiple_choice but options are Верно/Неверно, treat as true_false so UI shows correctly
    if (type === 'multiple_choice' && isTrueFalseOptions(options)) type = 'true_false'

    // Enforce exactly 4 options for multiple_choice and multiple_select; 2 for true_false (AI sometimes returns 5)
    if (type === 'multiple_choice' || type === 'multiple_select') {
      if (options.length > 4) options = options.slice(0, 4)
    } else if (type === 'true_false' && options.length > 2) {
      options = options.slice(0, 2)
    }

    const topics =
      forcedTopic
        ? [forcedTopic]
        : Array.isArray(q.topics)
          ? q.topics
              .filter((t): t is string => typeof t === 'string' && t.trim() !== '')
              .map((t) => t.trim())
          : undefined

    const rawCorrect = q.correctAnswer ?? q.correct_answer
    let correctAnswer =
      Array.isArray(rawCorrect)
        ? rawCorrect.filter((x): x is string => typeof x === 'string').map((x) => String(x).trim())
        : typeof rawCorrect === 'string'
          ? String(rawCorrect).trim()
          : ''

    // If we trimmed options to 4 (or 2 for true_false), keep only correct answers that still exist in options
    const optionSet = new Set(options.map((o) => o.trim()))
    if (Array.isArray(correctAnswer)) {
      correctAnswer = correctAnswer.filter((c) => optionSet.has(c))
      if (correctAnswer.length === 0 && options.length > 0) correctAnswer = [options[0]]
    } else if (typeof correctAnswer === 'string' && correctAnswer && !optionSet.has(correctAnswer) && options.length > 0) {
      correctAnswer = options[0]
    }

    // Question body: require "text" or "question" so we never show empty stem
    const rawText = (q.text ?? q.question) ?? ''
    const text = typeof rawText === 'string' && rawText.trim() ? rawText.trim() : `Question ${index + 1}`

    return {
      id: crypto.randomUUID(),
      type,
      text,
      options,
      correctAnswer,
      explanation: sanitizeExplanation(q.explanation),
      difficulty,
      topics: topics?.length ? topics : undefined,
    }
  })
}

function buildDifficultyInstruction(
  input: GenerateExamQuestionsInput,
  difficultyCriteria: string
): string {
  if (input.difficultyLevels) {
    const levels = input.difficultyLevels
    const total = levels.easy + levels.medium + levels.hard
    if (total === 0) {
      return `Mix of easy, medium, and hard questions. ${difficultyCriteria}`
    }
    // Calculate percentages so we don't say "generate 90 HARD" which confuses batching
    const easyPct = Math.round((levels.easy / total) * 100)
    const mediumPct = Math.round((levels.medium / total) * 100)
    const hardPct = Math.round((levels.hard / total) * 100)

    // If only one difficulty is requested, say "ALL questions should be X"
    if (easyPct === 100) return `ALL questions should be EASY difficulty. ${difficultyCriteria}`
    if (mediumPct === 100) return `ALL questions should be MEDIUM difficulty. ${difficultyCriteria}`
    if (hardPct === 100) return `ALL questions should be HARD difficulty. ${difficultyCriteria}`

    // Otherwise give percentage mix
    const parts: string[] = []
    if (easyPct > 0) parts.push(`${easyPct}% EASY`)
    if (mediumPct > 0) parts.push(`${mediumPct}% MEDIUM`)
    if (hardPct > 0) parts.push(`${hardPct}% HARD`)
    return `Difficulty distribution: ${parts.join(', ')}. ${difficultyCriteria}`
  }

  if (input.difficulty === 'mixed') {
    return `Mix of easy (30%), medium (50%), and hard (20%) questions. ${difficultyCriteria}`
  }

  return `ALL questions should be ${input.difficulty.toUpperCase()} difficulty. ${difficultyCriteria}`
}

function buildQuestionTypeInstruction(input: GenerateExamQuestionsInput): string {
  if (!input.questionTypes) return 'Include a mix of multiple_choice, true_false, multiple_select, and fill_blank'

  const types = input.questionTypes
  const total = types.multiple_choice + types.true_false + types.multiple_select + types.fill_blank
  if (total === 0) return 'Include a mix of multiple_choice, true_false, multiple_select, and fill_blank'

  // Collect which types are enabled (count > 0)
  const enabledTypes: string[] = []
  if (types.multiple_choice > 0) enabledTypes.push('multiple_choice')
  if (types.true_false > 0) enabledTypes.push('true_false')
  if (types.multiple_select > 0) enabledTypes.push('multiple_select')
  if (types.fill_blank > 0) enabledTypes.push('fill_blank')

  // If only one type is requested, say "Use ONLY X type"
  if (enabledTypes.length === 1) {
    return `Use ONLY ${enabledTypes[0]} question type. Do NOT use any other type.`
  }

  // Multiple types: give percentages instead of absolute counts (which confuse batching)
  const parts: string[] = []
  if (types.multiple_choice > 0) parts.push(`${Math.round((types.multiple_choice / total) * 100)}% multiple_choice`)
  if (types.true_false > 0) parts.push(`${Math.round((types.true_false / total) * 100)}% true_false`)
  if (types.multiple_select > 0) parts.push(`${Math.round((types.multiple_select / total) * 100)}% multiple_select`)
  if (types.fill_blank > 0) parts.push(`${Math.round((types.fill_blank / total) * 100)}% fill_blank`)
  return `Question type distribution: ${parts.join(', ')}`
}

export async function generateExamQuestionsFromDocuments(
  input: GenerateExamQuestionsInput
): Promise<{
  questions?: GeneratedQuestion[]
  error?: string
  usage?: GeminiUsage
}> {
  try {
    const topicsArray = parseTopicsInput(input.topics)

    const counts = input.topicQuestionCounts
    const hasCounts =
      counts &&
      counts.length === topicsArray.length &&
      counts.every((c) => toPositiveInt(c) > 0)

    // Smaller default batch size to reduce per-call latency and avoid timeouts on large exams
    const batchSize = Math.max(5, Math.min(50, Math.floor(Number(input.batchSize) || 10)))
    const chunksPerDoc =
      typeof input.chunksPerDoc === 'number'
        ? input.chunksPerDoc
        : topicsArray.length > 1
          ? 10
          : 5

    const languageName = getLanguageNameForPrompt(input.language)

    // Build a RAG query from topics or prompt
    const effectiveDocumentIds = Array.isArray(input.documentIds) ? input.documentIds : []
    const query = topicsArray.length > 0
      ? topicsArray.join(', ')
      : input.customPrompt || 'educational content for exam questions'

    // Base context (used for combined mode; per-topic uses topic-specific context)
    let documentContext = ''
    if (effectiveDocumentIds.length > 0) {
      try {
        documentContext = await getRelevantContentFromDocuments(
          effectiveDocumentIds,
          input.userId,
          query,
          chunksPerDoc
        )
      } catch {
        documentContext = ''
      }
      if (!documentContext || documentContext.trim().length < 50) {
        const fallback = input.documents?.length
          ? input.documents.map((d) => `Document: "${d.title}" (${d.file_type || 'unknown'})`).join('\n')
          : `Documents: ${effectiveDocumentIds.join(', ')}`
        documentContext = fallback
      }
    } else {
      // AI-only mode (no uploaded documents selected): generate from model knowledge + user topic focus.
      documentContext = topicsArray.length > 0
        ? `No uploaded document context was provided. Generate high-quality, curriculum-style exam questions based on general educational knowledge focused on: ${topicsArray.join(', ')}.`
        : `No uploaded document context was provided. Generate high-quality, curriculum-style exam questions from general educational knowledge. Use the user's instructions and selected settings.`
    }

    const difficultyCriteria = `
## DIFFICULTY LEVEL CRITERIA (CRITICAL - Follow these exactly):

**EASY Questions:**
- Direct recall of facts, definitions, or basic concepts from the document
- Single-step thinking; answer explicitly stated

**MEDIUM Questions:**
- Application/understanding; 2-3 steps of reasoning; connect concepts

**HARD Questions:**
- Analysis/synthesis/evaluation; complex multi-step reasoning; integrate multiple concepts
`

    const questionTypeInstruction = buildQuestionTypeInstruction(input)
    const difficultyInstruction = buildDifficultyInstruction(input, difficultyCriteria)

    // Per-topic mode guarantees exact counts + prevents mixing by generating each topic separately.
    const rawQuestions: RawQuestionFromAi[] = []
    const usageTotals: GeminiUsage = {
      input_tokens: 0,
      output_tokens: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    }
    const totalTopics = topicsArray.length
    const effectiveCount = Math.max(1, Math.floor(Number(input.questionCount) || 10))
    const startLabel = hasCounts && counts ? `${totalTopics} topic(s), per-topic counts` : `${effectiveCount} questions`
    console.log('[Exam] Starting generation:', startLabel)
    console.log('[Exam] Selected questionTypes:', input.questionTypes ?? 'mixed/all')
    console.log('[Exam] Selected difficulty:', input.difficulty, 'levels:', input.difficultyLevels ?? 'default')

    if (hasCounts && counts) {
      for (let i = 0; i < topicsArray.length; i++) {
        const topic = topicsArray[i]
        const topicCount = toPositiveInt(counts[i])
        if (topicCount <= 0) continue

        // Topic-specific context (capped to keep prompt size and latency reasonable)
        let topicContext = documentContext
        try {
          const topicRag = effectiveDocumentIds.length > 0
            ? await getRelevantContentFromDocuments(
                effectiveDocumentIds,
                input.userId,
                topic,
                chunksPerDoc
              )
            : ''
          if (topicRag && topicRag.trim().length > 50) topicContext = topicRag
        } catch {
          // keep fallback topicContext
        }
        topicContext = capContext(topicContext)

        const topicBatches = Math.ceil(topicCount / batchSize)
        const topicRaw: RawQuestionFromAi[] = []

        for (let batchIndex = 0; batchIndex < topicBatches; batchIndex++) {
          const batchCount = Math.min(batchSize, topicCount - topicRaw.length)
          const logLabel = `topic "${topic}" batch ${batchIndex + 1}/${topicBatches}`

          const prompt = `You are an expert exam creator. Generate professional, human-quality questions that are self-contained and fair to the student.
${EXAM_QUALITY_RULES}

Topic focus (STRICT): "${topic}"

${topicContext}

Requirements:
- Language: All questions, options, and explanations must be in ${languageName}
- Question types: ${questionTypeInstruction}
- Difficulty levels: ${difficultyInstruction}
- Each question should have clear, unambiguous correct answers
- Include helpful explanations for each question
- IMPORTANT: Include a "difficulty" field for EACH question ("easy", "medium", or "hard")
- CRITICAL: Set "topics": ["${topic}"] for EVERY question (exactly 1 topic)
${input.customPrompt ? `- Additional instructions: ${input.customPrompt}` : ''}
${EXAM_JSON_SCHEMA}

Return ONLY the JSON array, no other text. Generate exactly ${batchCount} questions.`

          const ai = await callGeminiWithTimeout(prompt, logLabel)
          usageTotals.input_tokens += ai.usage.input_tokens
          usageTotals.output_tokens += ai.usage.output_tokens
          usageTotals.prompt_tokens += ai.usage.prompt_tokens
          usageTotals.completion_tokens += ai.usage.completion_tokens
          usageTotals.total_tokens += ai.usage.total_tokens
          const batchParsed = safeJsonParse<RawQuestionFromAi[]>(ai.text, [])
          if (!Array.isArray(batchParsed) || batchParsed.length === 0) {
            if (batchIndex === 0) return { error: `Failed to generate questions for topic "${topic}".` }
            break
          }
          batchParsed.forEach((q) => { q.topics = [topic] })
          topicRaw.push(...batchParsed)
        }

        // Strictly enforce per-topic requested count even if AI over-generates in a batch.
        rawQuestions.push(...topicRaw.slice(0, topicCount))
      }
    } else {
      const effectiveQuestionCount = Math.max(1, Math.floor(Number(input.questionCount) || 10))
      const totalBatches = Math.ceil(effectiveQuestionCount / batchSize)
      const cappedContext = capContext(documentContext)

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchCount = Math.min(batchSize, effectiveQuestionCount - rawQuestions.length)
        const batchHint = totalBatches > 1
          ? `\n\nThis is batch ${batchIndex + 1} of ${totalBatches}. Generate exactly ${batchCount} NEW questions. Do NOT repeat/rephrase questions from previous batches.`
          : ''
        const logLabel = `batch ${batchIndex + 1}/${totalBatches}`

        const topicsInstruction = topicsArray.length > 0
          ? `\n- Topics to focus on: ${topicsArray.join(', ')}\n- IMPORTANT: Assign the MOST RELEVANT topic(s) to each question via a "topics" array field (1-2 topics).`
          : ''

        const prompt = `You are an expert exam creator. Generate ${batchCount} professional, human-quality exam questions based on the following educational documents. Questions must be self-contained and fair to the student.${batchHint}
${EXAM_QUALITY_RULES}

${cappedContext}

Requirements:
- Language: All questions, options, and explanations must be in ${languageName}
- Question types: ${questionTypeInstruction}
- Difficulty levels: ${difficultyInstruction}
- Each question should have clear, unambiguous correct answers
- Include helpful explanations for each question
- IMPORTANT: Include a "difficulty" field for EACH question ("easy", "medium", or "hard")${topicsInstruction}
${input.customPrompt ? `- Additional instructions: ${input.customPrompt}` : ''}
${EXAM_JSON_SCHEMA}

Return ONLY the JSON array, no other text. Generate exactly ${batchCount} questions.`

        const ai = await callGeminiWithTimeout(prompt, logLabel)
        usageTotals.input_tokens += ai.usage.input_tokens
        usageTotals.output_tokens += ai.usage.output_tokens
        usageTotals.prompt_tokens += ai.usage.prompt_tokens
        usageTotals.completion_tokens += ai.usage.completion_tokens
        usageTotals.total_tokens += ai.usage.total_tokens
        const batchParsed = safeJsonParse<RawQuestionFromAi[]>(ai.text, [])
        if (!Array.isArray(batchParsed) || batchParsed.length === 0) {
          if (batchIndex === 0) return { error: 'Failed to generate questions (invalid AI response).' }
          break
        }
        rawQuestions.push(...batchParsed)
      }
    }

    if (!rawQuestions.length) return { error: 'Failed to generate questions.' }

    // Normalize + validate shape
    // In per-topic mode, topics were forced earlier.
    const normalized = normalizeQuestions(rawQuestions)

    // If user did NOT specify topics, strip any auto-generated topics from AI.
    // This keeps topic tags strictly user-driven (no surprise tags).
    if (topicsArray.length === 0) {
      normalized.forEach((q) => {
        q.topics = undefined
      })
    } else {
      // Keep topics strictly within user-provided topic set (prevents unexpected extra topics).
      const allowedLower = new Map(topicsArray.map((t) => [t.toLowerCase(), t]))
      normalized.forEach((q) => {
        const filtered = (q.topics ?? [])
          .map((t) => t.trim())
          .filter((t) => allowedLower.has(t.toLowerCase()))
          .map((t) => allowedLower.get(t.toLowerCase()) as string)
        q.topics = filtered.length > 0 ? filtered : undefined
      })
    }

    return { questions: normalized, usage: usageTotals }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

export async function translateExamQuestions(input: {
  questions: GeneratedQuestion[]
  targetLanguage: string
}): Promise<{ questions?: GeneratedQuestion[]; error?: string; usage?: GeminiUsage }> {
  try {
    const languageName = getLanguageNameForPrompt(input.targetLanguage)
    const prompt = `You are a professional translator. Translate the following exam questions to ${languageName}.

Maintain the exact same structure and format. Translate:
- Question text
- All options
- Correct answer (must match one of the translated options for multiple choice)
- Explanation
- Topics (if present)

Questions to translate:
${JSON.stringify(input.questions, null, 2)}

Return ONLY a JSON array with the same structure.`

    const response = await callGemini(prompt)
    const translatedRaw = safeJsonParse<RawQuestionFromAi[]>(response.text, [])
    if (!Array.isArray(translatedRaw) || translatedRaw.length === 0) {
      return { error: 'Failed to translate questions.' }
    }

    const normalized = normalizeQuestions(translatedRaw)
    // Preserve IDs from original order when possible
    const withIds = normalized.map((q, idx) => ({ ...q, id: input.questions[idx]?.id || q.id }))
    return { questions: withIds, usage: response.usage }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

