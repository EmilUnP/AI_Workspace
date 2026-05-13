import { z } from 'zod'
import { generateJson } from '../ai/gemini.js'
import { DocumentRagService } from './document-rag.service.js'
import { resolveGeminiApiKeyForUser } from './gemini-key-resolver.service.js'
import type { FastifyInstance } from 'fastify'

const planSchema = z.object({
  documentId: z.string().uuid().optional(),
  documentIds: z.array(z.string().uuid()).optional(),
  name: z.string().min(1),
  language: z.string().default('en'),
  periodMonths: z.number().int().min(1).max(24).default(3),
  sessionsPerWeek: z.number().int().min(1).max(14).default(3),
  hoursPerSession: z.number().int().min(1).max(8).default(1)
})

type NormalizedWeek = {
  week: number
  title: string
  topics: string[]
  objectives: string[]
  notes: string
  sessions: Array<{
    session_number: number
    topic: string
    description: string
    learning_objectives: string[]
    duration_hours: number
  }>
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => asString(item)).filter(Boolean)
}

const buildSessions = (
  topics: string[],
  objectives: string[],
  sessionsPerWeek: number,
  hoursPerSession: number
) => {
  const safeSessionsPerWeek = Math.max(1, sessionsPerWeek)
  const sourceTopics = topics.length > 0 ? topics : ['']
  const chunkSize = Math.max(1, Math.ceil(sourceTopics.length / safeSessionsPerWeek))
  const objectiveChunkSize = Math.max(1, Math.ceil(Math.max(objectives.length, 1) / safeSessionsPerWeek))

  return Array.from({ length: safeSessionsPerWeek }, (_, index) => {
    const topicSlice = sourceTopics.slice(index * chunkSize, (index + 1) * chunkSize).filter(Boolean)
    const objectiveSlice = objectives.slice(index * objectiveChunkSize, (index + 1) * objectiveChunkSize)
    return {
      session_number: index + 1,
      topic: topicSlice[0] || `Session ${index + 1}`,
      description: topicSlice.slice(1).join('; '),
      learning_objectives: objectiveSlice,
      duration_hours: hoursPerSession,
    }
  })
}

const normalizeWeek = (
  value: unknown,
  fallbackWeek: number,
  sessionsPerWeek: number,
  hoursPerSession: number
): NormalizedWeek | null => {
  const row = asRecord(value)
  if (!row) return null

  const rawWeek = Number(row.week ?? row.week_number ?? fallbackWeek)
  const week = Number.isFinite(rawWeek) && rawWeek > 0 ? rawWeek : fallbackWeek
  const title = asString(row.title ?? row.theme ?? row.name) || `Week ${week}`
  const notes = asString(row.notes ?? row.description ?? row.summary)
  const topics = toStringArray(row.topics)
  const objectives = toStringArray(row.objectives ?? row.learning_objectives)
  const sessions = Array.isArray(row.sessions) ? row.sessions : []

  const sessionTopics = sessions
    .map((session) => {
      const s = asRecord(session)
      if (!s) return ''
      const sessionTopic = asString(s.topic ?? s.title ?? s.name)
      const sessionDescription = asString(s.description ?? s.details)
      if (sessionTopic && sessionDescription) return `${sessionTopic}: ${sessionDescription}`
      return sessionTopic || sessionDescription
    })
    .filter(Boolean)

  const sessionObjectives = sessions.flatMap((session) => {
    const s = asRecord(session)
    if (!s) return []
    return toStringArray(s.learning_objectives)
  })

  const mergedTopics = Array.from(new Set([...topics, ...sessionTopics]))
  const mergedObjectives = Array.from(new Set([...objectives, ...sessionObjectives]))
  if (!title && mergedTopics.length === 0 && mergedObjectives.length === 0 && !notes) return null
  const normalizedSessions = sessions
    .map((session, index) => {
      const s = asRecord(session)
      if (!s) return null
      const rawNumber = Number(s.session_number ?? s.number)
      const sessionNumber = Number.isFinite(rawNumber) && rawNumber > 0 ? rawNumber : index + 1
      const topic = asString(s.topic ?? s.title ?? s.name) || `Session ${sessionNumber}`
      const description = asString(s.description ?? s.details ?? s.summary)
      const learningObjectives = toStringArray(s.learning_objectives ?? s.objectives)
      const rawDuration = Number(s.duration_hours ?? s.durationHours ?? hoursPerSession)
      const durationHours = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : hoursPerSession
      return {
        session_number: sessionNumber,
        topic,
        description,
        learning_objectives: learningObjectives,
        duration_hours: durationHours,
      }
    })
    .filter((session): session is NonNullable<typeof session> => Boolean(session))
    .sort((a, b) => a.session_number - b.session_number)
  const sessionsOut =
    normalizedSessions.length > 0
      ? normalizedSessions.map((session, index) => ({ ...session, session_number: index + 1 }))
      : buildSessions(mergedTopics, mergedObjectives, sessionsPerWeek, hoursPerSession)

  return {
    week,
    title,
    topics: mergedTopics,
    objectives: mergedObjectives,
    notes,
    sessions: sessionsOut,
  }
}

const extractWeeks = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw
  const root = asRecord(raw)
  if (!root) return []

  if (Array.isArray(root.weeks)) return root.weeks
  if (Array.isArray(root.plan)) return root.plan
  if (Array.isArray(root.content)) return root.content

  const planContent = Array.isArray(root.plan_content)
    ? root.plan_content
    : Array.isArray(root.planContent)
      ? root.planContent
      : []

  if (planContent.length > 0) {
    const monthWeeks = planContent.flatMap((monthItem) => {
      const month = asRecord(monthItem)
      if (!month || !Array.isArray(month.weeks)) return []
      return month.weeks
    })
    if (monthWeeks.length > 0) return monthWeeks
  }

  return []
}

const normalizePlanContent = (
  raw: unknown,
  targetWeeks: number,
  sessionsPerWeek: number,
  hoursPerSession: number
): NormalizedWeek[] => {
  const extractedWeeks = extractWeeks(raw)
  const normalized = extractedWeeks
    .map((item, index) => normalizeWeek(item, index + 1, sessionsPerWeek, hoursPerSession))
    .filter((item): item is NormalizedWeek => Boolean(item))
    .sort((a, b) => a.week - b.week)
    .map((item, index) => ({ ...item, week: index + 1 }))

  const finalWeeks = normalized.slice(0, targetWeeks)
  if (finalWeeks.length > 0) return finalWeeks

  return Array.from({ length: targetWeeks }, (_, index) => ({
    week: index + 1,
    title: `Week ${index + 1}`,
    topics: [],
    objectives: [],
    notes: '',
    sessions: buildSessions([], [], sessionsPerWeek, hoursPerSession),
  }))
}

export class EducationPlanAiService {
  private readonly rag: DocumentRagService
  constructor(private readonly app: FastifyInstance) {
    this.rag = new DocumentRagService(app)
  }

  async generate(userId: string, input: unknown) {
    const data = planSchema.parse(input)
    const targetWeeks = data.periodMonths * 4
    const allDocumentIds = Array.from(new Set([...(data.documentIds || []), ...(data.documentId ? [data.documentId] : [])]))
    const primaryDocumentId = allDocumentIds[0]
    if (!primaryDocumentId) {
      throw new Error('At least one source document is required')
    }

    const retrieved = await this.rag.retrieve(userId, {
      documentId: primaryDocumentId,
      query: `Create education plan named ${data.name}`,
      topK: 8
    })

    const apiKey = await resolveGeminiApiKeyForUser(this.app, userId)
    const rawContent = await generateJson<unknown>(
      `Generate a weekly education plan in ${data.language}.
Plan name: ${data.name}
Period months: ${data.periodMonths}
Sessions/week: ${data.sessionsPerWeek}
Hours/session: ${data.hoursPerSession}
Target total weeks: ${targetWeeks}
Context:\n${retrieved.chunks.join('\n\n')}

Return ONLY JSON in this exact shape:
{
  "weeks": [
    {
      "week": 1,
      "title": "Week title",
      "topics": ["topic 1", "topic 2"],
      "objectives": ["objective 1", "objective 2"],
      "notes": "optional note"
    }
  ]
}

Rules:
- Include exactly ${targetWeeks} week items.
- week must start at 1 and increase sequentially.
- Keep field names exactly as shown.
- topics and objectives must always be arrays of strings.`,
      'gemini-2.5-flash',
      { apiKey }
    )
    const content = normalizePlanContent(rawContent, targetWeeks, data.sessionsPerWeek, data.hoursPerSession)

    const { rows } = await this.app.db.query<{ id: string }>(
      `INSERT INTO education_plans (user_id, name, period_months, sessions_per_week, hours_per_session, document_ids, content)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb) RETURNING id`,
      [userId, data.name, data.periodMonths, data.sessionsPerWeek, data.hoursPerSession, JSON.stringify(allDocumentIds), JSON.stringify(content)]
    )

    return { id: rows[0].id, content }
  }
}
