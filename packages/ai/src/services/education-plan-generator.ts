/**
 * Education Plan Generator
 * Generates week-by-week curriculum plan (AI) from optional documents and parameters.
 * Output is structured for clarity, progression, and practical use.
 */

import { generateContent } from '../gemini'
import { getParsedDocumentText } from './document-rag'
import type { EducationPlanWeek } from '@eduator/core/types/education-plan'
import { AI_MODELS } from '@eduator/config'

export interface GenerateEducationPlanParams {
  organizationId: string
  teacherId: string
  classId?: string
  className?: string
  documentIds: string[]
  periodMonths: number
  sessionsPerWeek: number
  hoursPerSession: number
  audience: string
  /** Language code (e.g. 'en', 'az') or full name for the prompt */
  language: string
}

function parseJsonArray<T>(raw: string): T {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  return JSON.parse(cleaned.trim()) as T
}

export async function generateEducationPlanContent(
  params: GenerateEducationPlanParams
): Promise<{
  content: EducationPlanWeek[]
  usage: {
    input_tokens: number
    output_tokens: number
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    model_used: string
  }
}> {
  const {
    teacherId,
    className = 'this class',
    documentIds,
    periodMonths,
    sessionsPerWeek,
    hoursPerSession,
    audience,
    language,
  } = params

  let documentContext = ''
  if (documentIds.length > 0) {
    const chunks: string[] = []
    for (const docId of documentIds.slice(0, 5)) {
      try {
        const text = await getParsedDocumentText(docId, teacherId, false)
        if (text && text.length > 0) {
          chunks.push(text.slice(0, 12000))
        }
      } catch (e) {
        console.warn('Could not load document for plan:', docId, e)
      }
    }
    if (chunks.length > 0) {
      documentContext = `\n\nReference content from the teacher's documents. Align week topics and objectives with this content where relevant:\n\n${chunks.join('\n\n---\n\n')}`
    }
  }

  const totalWeeks = Math.max(4, Math.min(52, periodMonths * 4))
  const hoursPerWeek = sessionsPerWeek * hoursPerSession
  const totalHours = totalWeeks * hoursPerWeek
  const languageInstruction = language
    ? `Write every user-facing string (title, topics, objectives, notes) strictly in ${language}. No other language.`
    : ''

  // One topic per session/lesson per week. 2 sessions/week => 2 topics per week; 5 sessions/week => 5 topics per week.
  const topicsPerWeek = sessionsPerWeek
  const objectivesPerWeek = `${Math.min(2, sessionsPerWeek)}–${sessionsPerWeek}`

  const prompt = `You are an expert curriculum designer. Produce a week-by-week education plan as a single JSON array. The plan must match the schedule exactly.

Context:
- Class/group: ${className}
- Duration: ${periodMonths} month(s) = exactly ${totalWeeks} weeks (no more, no less).
- Lessons per week: ${sessionsPerWeek} sessions (lessons) per week — so each week must have exactly ${topicsPerWeek} topics (one topic per lesson/session).
- Hours: ${hoursPerSession}h per session (informative only). Total: ~${totalHours} hours over ${totalWeeks} weeks.
- Audience: ${audience || 'general'}
${documentContext}
${languageInstruction ? `\nLanguage: ${languageInstruction}\n` : ''}

Rules:
1. Return a JSON array of exactly ${totalWeeks} objects. Week numbers 1, 2, 3, ... ${totalWeeks}. Nothing else.
2. Each object must have:
   - "week": number (1 to ${totalWeeks})
   - "title": string — short week theme (e.g. "Introduction to X")
   - "topics": string[] — exactly ${topicsPerWeek} concrete topics for that week (one topic per session/lesson; if ${sessionsPerWeek} lessons per week then ${topicsPerWeek} topics)
   - "objectives": string[] — ${objectivesPerWeek} learning objectives for that week (actionable)
   - "notes": string — optional one short sentence or leave empty
3. Distribute content evenly: early weeks = foundations; middle = practice; later = review/extension. If documents were provided, align with that content.
4. Every week must have exactly ${topicsPerWeek} topics and at least 2 objectives. No duplicate weeks.
5. Output ONLY the JSON array. No markdown, no explanation.
6. Write in a professional educational tone. Avoid filler/source-referencing intros such as "according to the text", "the document states", "Mətndə ... qeyd olunur ki", or similar phrases in any language.`

  const { text, tokensUsed, promptTokens, completionTokens, totalTokens } = await generateContent(prompt, {
    model: 'flash',
  })
  const data = parseJsonArray<EducationPlanWeek[]>(text)
  if (!Array.isArray(data)) {
    throw new Error('AI did not return an array')
  }
  const content = data.slice(0, totalWeeks).map((item, i) => ({
    week: typeof item.week === 'number' ? item.week : i + 1,
    title: typeof item.title === 'string' ? (item.title.trim() || `Week ${i + 1}`) : `Week ${i + 1}`,
    topics: Array.isArray(item.topics) ? item.topics.filter(Boolean).map(String) : [],
    objectives: Array.isArray(item.objectives) ? item.objectives.filter(Boolean).map(String) : [],
    notes: typeof item.notes === 'string' && item.notes.trim() ? item.notes.trim() : undefined,
  }))
  return {
    content,
    usage: {
      input_tokens: promptTokens ?? tokensUsed,
      output_tokens: completionTokens ?? 0,
      prompt_tokens: promptTokens ?? tokensUsed,
      completion_tokens: completionTokens ?? 0,
      total_tokens: totalTokens ?? tokensUsed,
      model_used: AI_MODELS.GEMINI_FLASH,
    },
  }
}
