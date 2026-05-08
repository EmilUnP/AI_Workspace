'use client'

import { useTranslations } from 'next-intl'

interface Props {
  content: unknown
}

type RenderWeek = {
  week: number
  title: string
  topics: string[]
  objectives: string[]
  notes: string
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

const toRenderWeek = (value: unknown): RenderWeek => {
  const row = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const week = Number(row.week ?? row.week_number ?? row.weekIndex)
  const title = pickString(row, ['title', 'week_title', 'name'])
  const notes = pickString(row, ['notes', 'description', 'summary'])
  const topicsRaw = Array.isArray(row.topics)
    ? row.topics
    : Array.isArray(row.items)
      ? row.items
      : []
  const topics = topicsRaw.map((item) => formatTopic(item)).filter(Boolean)
  const objectivesRaw = Array.isArray(row.objectives)
    ? row.objectives
    : Array.isArray(row.learning_objectives)
      ? row.learning_objectives
      : []
  const objectives = objectivesRaw.map((item) => asTrimmedString(item)).filter(Boolean)

  return {
    week: Number.isFinite(week) ? week : 0,
    title,
    topics,
    objectives,
    notes,
  }
}

export function EducationPlanViewClient({ content }: Props) {
  const t = useTranslations('teacherEducationPlans')
  const rawWeeks = extractRawWeeks(content)
  const normalizedContent = rawWeeks
    .map((week, index) => {
      const parsed = toRenderWeek(week)
      return { ...parsed, week: parsed.week > 0 ? parsed.week : index + 1 }
    })
    .filter((week) => week.title || week.topics.length > 0 || week.objectives.length > 0 || week.notes)
  const fallbackText = extractPlanText(content)
  const fallbackWeeks = normalizedContent.length === 0 && fallbackText
    ? parseWeeksFromFallbackText(fallbackText)
    : []
  const renderWeeksBase = normalizedContent.length > 0 ? normalizedContent : fallbackWeeks
  const renderWeeks =
    renderWeeksBase.length === 1 && renderWeeksBase[0].topics.length > 8
      ? chunkArray(renderWeeksBase[0].topics, 6).map((topicsChunk, index) => ({
          week: index + 1,
          title: index === 0 ? renderWeeksBase[0].title : `${renderWeeksBase[0].title} - ${t('part')} ${index + 1}`,
          topics: topicsChunk,
          objectives: index === 0 ? renderWeeksBase[0].objectives : [],
          notes: index === 0 ? renderWeeksBase[0].notes : '',
        }))
      : renderWeeksBase

  return (
    <div className="space-y-4">
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {renderWeeks.length > 0 ? (
          <div className="space-y-3">
            {renderWeeks.map((week) => (
              <article key={week.week} className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('weekNum', { week: week.week })}: {week.title || t('weekNum', { week: week.week })}
                </h3>

                {week.topics.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {week.topics.map((topic, i) => (
                      <li key={i}>{topic}</li>
                    ))}
                  </ul>
                )}

                {week.objectives.length > 0 && (
                  <p className="mt-3 text-sm text-gray-600">
                    <span className="font-medium text-gray-700">{t('objectivesLabel')}:</span>{' '}
                    {week.objectives.join('; ')}
                  </p>
                )}

                {week.notes && (
                  <p className="mt-2 text-sm text-gray-500">{week.notes}</p>
                )}
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

