'use client'

import { useTranslations } from 'next-intl'
import type { EducationPlanWeek } from '@eduator/core/types/education-plan'

interface Props {
  content: EducationPlanWeek[]
}

type RenderWeek = {
  week: number
  title: string
  topics: string[]
  objectives: string[]
  notes: string
}

const toRenderWeek = (value: unknown): RenderWeek => {
  const row = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const week = Number(row.week)
  const title = typeof row.title === 'string' ? row.title : ''
  const notes = typeof row.notes === 'string' ? row.notes : ''
  const topics = Array.isArray(row.topics) ? row.topics.filter((item): item is string => typeof item === 'string') : []
  const objectives = Array.isArray(row.objectives) ? row.objectives.filter((item): item is string => typeof item === 'string') : []

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
  const normalizedContent = (content || []).map((week) => toRenderWeek(week))

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
        {normalizedContent.map((week) => (
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
        ))}
      </div>
    </div>
  )
}

