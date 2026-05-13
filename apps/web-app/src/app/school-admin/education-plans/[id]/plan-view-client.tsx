'use client'

import { useTranslations } from 'next-intl'

interface Props {
  content: unknown
  sessionsPerWeek: number
  hoursPerSession: number
}

type RenderSession = {
  number: number
  title: string
  description: string
  objectives: string[]
  durationHours: number
}

type RenderWeek = {
  week: number
  title: string
  topics: string[]
  objectives: string[]
  notes: string
  sessions: RenderSession[]
}

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const asTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

const pickString = (row: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const value = asTrimmedString(row[key])
    if (value) return value
  }
  return ''
}

const extractPlanText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value.map((item) => extractPlanText(item)).filter(Boolean).join('\n\n').trim()
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    const parts = entries
      .map(([key, item]) => {
        const inner = extractPlanText(item)
        if (!inner) return ''
        return `${key}:\n${inner}`
      })
      .filter(Boolean)
    return parts.join('\n\n').trim()
  }
  return ''
}

const parseWeeksFromFallbackText = (text: string): RenderWeek[] => {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const weeks: RenderWeek[] = []
  let currentWeek: RenderWeek | null = null
  let pendingTitle = ''
  let lastKey: 'title' | 'description' | null = null

  const ensureWeek = () => {
    if (!currentWeek) {
      currentWeek = {
        week: weeks.length + 1,
        title: '',
        topics: [],
        objectives: [],
        notes: '',
        sessions: [],
      }
    }
  }

  const applyTitle = (value: string) => {
    if (!value) return
    ensureWeek()
    pendingTitle = value
    if (!currentWeek!.title) currentWeek!.title = value
  }

  const applyDescription = (value: string) => {
    if (!value) return
    ensureWeek()
    if (pendingTitle) {
      currentWeek!.topics.push(`${pendingTitle}: ${value}`)
      pendingTitle = ''
    } else {
      currentWeek!.notes = currentWeek!.notes ? `${currentWeek!.notes}\n${value}` : value
    }
  }

  for (const line of lines) {
    const lower = line.toLowerCase()

    if (lastKey === 'title' && !lower.includes(':')) {
      applyTitle(line)
      lastKey = null
      continue
    }
    if (lastKey === 'description' && !lower.includes(':')) {
      applyDescription(line)
      lastKey = null
      continue
    }

    if (lower.startsWith('week:') || lower.startsWith('week ')) {
      const n = Number(line.replace(/[^\d]/g, ''))
      if (currentWeek && (currentWeek.title || currentWeek.topics.length || currentWeek.notes)) {
        weeks.push(currentWeek)
      }
      currentWeek = {
        week: Number.isFinite(n) && n > 0 ? n : weeks.length + 1,
        title: '',
        topics: [],
        objectives: [],
        notes: '',
        sessions: [],
      }
      pendingTitle = ''
      lastKey = null
      continue
    }

    if (lower.startsWith('title:')) {
      const titleValue = line.slice(line.indexOf(':') + 1).trim()
      if (titleValue) applyTitle(titleValue)
      else lastKey = 'title'
      continue
    }

    if (lower.startsWith('description:')) {
      const descriptionValue = line.slice(line.indexOf(':') + 1).trim()
      if (descriptionValue) applyDescription(descriptionValue)
      else lastKey = 'description'
      continue
    }
  }

  if (currentWeek && (currentWeek.title || currentWeek.topics.length || currentWeek.notes)) {
    weeks.push(currentWeek)
  }

  return weeks.map((week, index) => ({
    ...week,
    week: week.week > 0 ? week.week : index + 1,
    title: week.title || '',
  }))
}

const formatTopic = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  const row = asRecord(value)
  if (!row) return ''

  const title = pickString(row, ['title', 'name', 'topic', 'heading'])
  const description = pickString(row, ['description', 'details', 'content', 'note'])
  if (title && description) return `${title}: ${description}`
  return title || description
}

const buildSessionsFromWeek = (
  week: RenderWeek,
  sessionsPerWeek: number,
  hoursPerSession: number
): RenderSession[] => {
  const safeSessionsPerWeek = Math.max(1, sessionsPerWeek)
  const sourceTopics = week.topics.length > 0 ? week.topics : [week.title || '']
  const sourceObjectives = week.objectives
  const chunkSize = Math.max(1, Math.ceil(sourceTopics.length / safeSessionsPerWeek))
  const objectiveChunkSize = Math.max(1, Math.ceil(Math.max(sourceObjectives.length, 1) / safeSessionsPerWeek))

  return Array.from({ length: safeSessionsPerWeek }, (_, index) => {
    const topicSlice = sourceTopics.slice(index * chunkSize, (index + 1) * chunkSize).filter(Boolean)
    const objectiveSlice = sourceObjectives.slice(
      index * objectiveChunkSize,
      (index + 1) * objectiveChunkSize
    )
    const title = topicSlice[0] || week.title || ''
    const description = topicSlice.slice(1).join('; ')
    return {
      number: index + 1,
      title,
      description,
      objectives: objectiveSlice,
      durationHours: hoursPerSession,
    }
  })
}

const extractRawWeeks = (content: unknown): unknown[] => {
  if (Array.isArray(content)) return content
  const root = asRecord(content)
  if (!root) return []

  const planContentArray = Array.isArray(root.plan_content)
    ? root.plan_content
    : Array.isArray(root.planContent)
      ? root.planContent
      : null
  if (planContentArray) {
    const flattenedWeeks = planContentArray.flatMap((monthItem) => {
      const monthRecord = asRecord(monthItem)
      if (!monthRecord || !Array.isArray(monthRecord.weeks)) return []
      return monthRecord.weeks
    })
    if (flattenedWeeks.length > 0) return flattenedWeeks
  }

  const planContent = asRecord(root.plan_content) || asRecord(root.planContent)
  if (planContent) {
    if (Array.isArray(planContent.weeks)) return planContent.weeks
    if (asRecord(planContent.weeks)) return [planContent.weeks]
    if (Array.isArray(planContent.topics)) {
      return [{ week: 1, title: root.plan_name, topics: planContent.topics }]
    }
  }

  if (Array.isArray(root.weeks)) return root.weeks
  if (asRecord(root.weeks)) return [root.weeks]
  if (Array.isArray(root.content)) return root.content
  if (Array.isArray(root.plan)) return root.plan
  if (Array.isArray(root.items)) return root.items
  if (Array.isArray(root.topics)) return [{ week: 1, title: root.plan_name, topics: root.topics }]

  return []
}

const toRenderWeek = (value: unknown, hoursPerSession: number): RenderWeek => {
  const row = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const week = Number(row.week ?? row.week_number ?? row.weekIndex)
  const title = pickString(row, ['title', 'week_title', 'name'])
  const notes = pickString(row, ['notes', 'description', 'summary'])
  const sessionsRaw = Array.isArray(row.sessions) ? row.sessions : []
  const topicsRaw = Array.isArray(row.topics)
    ? row.topics
    : Array.isArray(row.items)
      ? row.items
      : []
  const sessionTopics = sessionsRaw
    .map((session) => {
      const sessionRow = asRecord(session)
      if (!sessionRow) return ''
      const sessionNumber = Number(sessionRow.session_number)
      const topic = pickString(sessionRow, ['topic', 'title', 'name'])
      const description = pickString(sessionRow, ['description', 'details', 'summary'])
      const prefix = Number.isFinite(sessionNumber) && sessionNumber > 0 ? `${sessionNumber}. ` : ''
      if (topic && description) return `${prefix}${topic}: ${description}`
      return `${prefix}${topic || description}`
    })
    .filter(Boolean)
  const topics = [...topicsRaw.map((item) => formatTopic(item)).filter(Boolean), ...sessionTopics]
  const objectivesRaw = Array.isArray(row.objectives)
    ? row.objectives
    : Array.isArray(row.learning_objectives)
      ? row.learning_objectives
      : []
  const sessionObjectives = sessionsRaw
    .flatMap((session) => {
      const sessionRow = asRecord(session)
      if (!sessionRow) return []
      const values = Array.isArray(sessionRow.learning_objectives) ? sessionRow.learning_objectives : []
      return values.map((item) => asTrimmedString(item)).filter(Boolean)
    })
  const objectives = [...objectivesRaw.map((item) => asTrimmedString(item)).filter(Boolean), ...sessionObjectives]
  const sessions: RenderSession[] = sessionsRaw
    .map((session, index) => {
      const sessionRow = asRecord(session)
      if (!sessionRow) return null
      const rawNumber = Number(sessionRow.session_number)
      const topic = pickString(sessionRow, ['topic', 'title', 'name'])
      const description = pickString(sessionRow, ['description', 'details', 'summary'])
      const learningObjectives = Array.isArray(sessionRow.learning_objectives)
        ? sessionRow.learning_objectives.map((item) => asTrimmedString(item)).filter(Boolean)
        : []
      const rawDurationHours = Number(sessionRow.duration_hours ?? sessionRow.durationHours)
      if (!topic && !description && learningObjectives.length === 0) return null
      return {
        number: Number.isFinite(rawNumber) && rawNumber > 0 ? rawNumber : index + 1,
        title: topic,
        description,
        objectives: learningObjectives,
        durationHours: Number.isFinite(rawDurationHours) && rawDurationHours > 0 ? rawDurationHours : hoursPerSession,
      }
    })
    .filter((session): session is RenderSession => Boolean(session))

  return {
    week: Number.isFinite(week) ? week : 0,
    title,
    topics,
    objectives,
    notes,
    sessions,
  }
}

export function EducationPlanViewClient({ content, sessionsPerWeek, hoursPerSession }: Props) {
  const t = useTranslations('teacherEducationPlans')
  const rawWeeks = extractRawWeeks(content)
  const normalizedContent = rawWeeks
    .map((week, index) => {
      const parsed = toRenderWeek(week, hoursPerSession)
      return { ...parsed, week: index + 1 }
    })
    .filter((week) => week.title || week.topics.length > 0 || week.objectives.length > 0 || week.notes)
  const fallbackText = extractPlanText(content)
  const fallbackWeeks = normalizedContent.length === 0 && fallbackText
    ? parseWeeksFromFallbackText(fallbackText)
    : []
  const renderWeeksBase = normalizedContent.length > 0 ? normalizedContent : fallbackWeeks
  const renderWeeksBaseProcessed =
    renderWeeksBase.length === 1 && renderWeeksBase[0].topics.length > 8
      ? chunkArray(renderWeeksBase[0].topics, 6).map((topicsChunk, index) => ({
          week: index + 1,
          title: index === 0 ? renderWeeksBase[0].title : `${renderWeeksBase[0].title} - ${t('part')} ${index + 1}`,
          topics: topicsChunk,
          objectives: index === 0 ? renderWeeksBase[0].objectives : [],
          notes: index === 0 ? renderWeeksBase[0].notes : '',
          sessions: index === 0 ? renderWeeksBase[0].sessions : [],
        }))
      : renderWeeksBase
  const renderWeeks = renderWeeksBaseProcessed.map((week) => ({
    ...week,
    sessions:
      week.sessions.length > 0
        ? week.sessions
            .slice()
            .sort((a, b) => a.number - b.number)
            .map((session, index) => ({ ...session, number: index + 1 }))
        : buildSessionsFromWeek(week, sessionsPerWeek, hoursPerSession),
  }))

  return (
    <div className="space-y-4">
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {renderWeeks.length > 0 ? (
          <div className="space-y-3">
            {renderWeeks.map((week) => (
              <article key={`${week.week}-${week.title || 'week'}`} className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('weekNum', { week: week.week })}: {week.title || t('weekNum', { week: week.week })}
                </h3>

                {week.sessions.length > 0 && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t('weeklyDeliveryPlan')}</p>
                      <p className="text-xs text-gray-600">{sessionsPerWeek} {t('timesPerWeek')} · {hoursPerSession}{t('hours')}</p>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {week.sessions.map((session) => (
                        <div key={`${week.week}-${session.number}`} className="rounded-md border border-gray-200 bg-white p-2.5">
                          <p className="text-xs font-semibold text-gray-800">
                            {t('sessionLabel', { number: session.number })} · {session.durationHours}{t('hours')}
                          </p>
                          {session.title ? <p className="mt-1 text-sm text-gray-700 line-clamp-2">{session.title}</p> : null}
                          {session.description ? <p className="mt-1 text-xs text-gray-600 line-clamp-2">{session.description}</p> : null}
                          {session.objectives.length > 0 ? (
                            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-gray-600">
                              {session.objectives.map((objective, objectiveIndex) => (
                                <li key={`${week.week}-${session.number}-${objectiveIndex}`}>{objective}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {week.notes ? <p className="mt-3 text-sm text-gray-500">{week.notes}</p> : null}
              </article>
            ))}
          </div>
        ) : fallbackText ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">{t('planContentTitle')}</h3>
            <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              {fallbackText}
            </pre>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            {t('noPlanContentFound')}
          </div>
        )}
      </div>
    </div>
  )
}

