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

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
        {normalizedContent.length > 0 ? (
          normalizedContent.map((week) => (
            <div key={week.week} className="p-4">
              <h3 className="font-medium text-gray-900">
                {t('weekNum', { week: week.week })}: {week.title || t('weekNum', { week: week.week })}
              </h3>
              {week.topics?.length > 0 && (
                <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                  {week.topics.map((topic, i) => (
                    <li key={i}>{topic}</li>
                  ))}
                </ul>
              )}
              {Array.isArray(week.objectives) && week.objectives.length > 0 && (
                <p className="mt-2 text-sm text-gray-500">{t('objectivesLabel')} {week.objectives.join('; ')}</p>
              )}
              {week.notes && <p className="mt-1 text-xs text-gray-400">{week.notes}</p>}
            </div>
          ))
        ) : fallbackText ? (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900">Plan content</h3>
            <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              {fallbackText}
            </pre>
          </div>
        ) : (
          <div className="p-6 text-sm text-gray-500">No plan content found for this plan.</div>
        )}
      </div>
    </div>
  )
}

