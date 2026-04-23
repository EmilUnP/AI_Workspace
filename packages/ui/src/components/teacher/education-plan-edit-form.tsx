'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, BookOpen } from 'lucide-react'
import type { EducationPlanWeek } from '@eduator/core/types/education-plan'
import { EDUCATION_PLAN_AUDIENCE_OPTIONS } from './education-plan-create-form'

function normalizeWeek(w: EducationPlanWeek, index: number): EducationPlanWeek {
  return {
    week: typeof w.week === 'number' ? w.week : index + 1,
    title: typeof w.title === 'string' ? w.title : `Week ${index + 1}`,
    topics: Array.isArray(w.topics) ? w.topics.filter(Boolean).map(String) : [],
    objectives: Array.isArray(w.objectives) ? w.objectives.filter(Boolean).map(String) : [],
    notes: typeof w.notes === 'string' ? w.notes : undefined,
  }
}

export interface EducationPlanEditFormLabels {
  backToPlans?: string
  editTitle?: string
  editSubtitle?: string
  detailsSchedule?: string
  planName?: string
  planNamePlaceholder?: string
  descriptionOptional?: string
  briefDescription?: string
  periodMonths?: string
  sessionsPerWeek?: string
  hoursPerSession?: string
  audience?: string
  audiencePlaceholder?: string
  selectAudience?: string
  otherCustom?: string
  planContentWeekByWeek?: string
  planContentHint?: string
  weekTitlePlaceholder?: string
  topicsPerLine?: string
  oneTopicPerLine?: string
  objectivesPerLine?: string
  oneObjectivePerLine?: string
  notesOptional?: string
  notesPlaceholder?: string
  cancel?: string
  saveChanges?: string
  failedToSave?: string
}

const DEFAULT_EDIT_FORM_LABELS: EducationPlanEditFormLabels = {
  backToPlans: 'Back to Education Plans',
  editTitle: 'Edit plan',
  editSubtitle: 'Update plan name, description, schedule, and week-by-week content.',
  detailsSchedule: 'Details & schedule',
  planName: 'Plan name *',
  planNamePlaceholder: 'e.g. Algebra I — Fall 2025',
  descriptionOptional: 'Description (optional)',
  briefDescription: 'Brief description of this plan',
  periodMonths: 'Period (months)',
  sessionsPerWeek: 'Sessions/week',
  hoursPerSession: 'Hours/session',
  audience: 'Audience',
  audiencePlaceholder: 'e.g. Grade 10, Adult learners',
  selectAudience: 'Select audience',
  otherCustom: 'Other (custom)',
  planContentWeekByWeek: 'Plan content (week-by-week)',
  planContentHint: 'Edit titles, topics, objectives, and notes for each week.',
  weekTitlePlaceholder: 'Week {week} title',
  topicsPerLine: 'Topics (one per line)',
  oneTopicPerLine: 'One topic per line',
  objectivesPerLine: 'Objectives (one per line)',
  oneObjectivePerLine: 'One objective per line',
  notesOptional: 'Notes (optional)',
  notesPlaceholder: 'Teaching tip or resource',
  cancel: 'Cancel',
  saveChanges: 'Save changes',
  failedToSave: 'Failed to save',
}

export interface EducationPlanEditFormProps {
  planId: string
  initialData: {
    name: string
    description: string | null
    period_months: number
    sessions_per_week: number
    hours_per_session: number
    audience: string | null
  }
  /** Week-by-week plan content (editable) */
  content?: EducationPlanWeek[] | null
  updateAction: (
    planId: string,
    params: {
      name?: string
      description?: string | null
      period_months?: number
      sessions_per_week?: number
      hours_per_session?: number
      audience?: string | null
      content?: EducationPlanWeek[]
    }
  ) => Promise<{ error?: string | null }>
  backHref: string
  /** Base path for plan detail, e.g. "/teacher/education-plans". Redirect will go to ${planDetailBase}/${planId} */
  planDetailBase: string
  labels?: EducationPlanEditFormLabels
  /** Translated audience dropdown options (value must match EDUCATION_PLAN_AUDIENCE_OPTIONS: '', 'Grade 1', ... '__other__') */
  audienceOptions?: Array<{ value: string; label: string }>
}

export function EducationPlanEditForm({
  planId,
  initialData,
  content: planContent,
  updateAction,
  backHref,
  planDetailBase,
  labels = {},
  audienceOptions: audienceOptionsProp,
}: EducationPlanEditFormProps) {
  const L = { ...DEFAULT_EDIT_FORM_LABELS, ...labels }
  const router = useRouter()
  const audienceOptionsList = audienceOptionsProp ?? EDUCATION_PLAN_AUDIENCE_OPTIONS.map((o) => ({
    value: o.value,
    label: o.value === '' ? (L.selectAudience ?? o.label) : o.value === '__other__' ? (L.otherCustom ?? o.label) : o.label,
  }))
  const [name, setName] = useState(initialData.name)
  const [description, setDescription] = useState(initialData.description ?? '')
  const [periodMonths, setPeriodMonths] = useState(initialData.period_months)
  const [sessionsPerWeek, setSessionsPerWeek] = useState(initialData.sessions_per_week)
  const [hoursPerSession, setHoursPerSession] = useState(initialData.hours_per_session)
  const initialAudience = initialData.audience ?? ''
  const knownOption = EDUCATION_PLAN_AUDIENCE_OPTIONS.find((o) => o.value && o.value !== '__other__' && o.value === initialAudience)
  const [audienceSelectValue, setAudienceSelectValue] = useState<string>(
    knownOption ? initialAudience : (initialAudience ? '__other__' : '')
  )
  const [audienceCustom, setAudienceCustom] = useState(knownOption ? '' : initialAudience)
  const resolvedAudience = audienceSelectValue === '__other__' ? audienceCustom.trim() : audienceSelectValue
  const [content, setContent] = useState<EducationPlanWeek[]>(() =>
    Array.isArray(planContent) && planContent.length > 0
      ? planContent.map(normalizeWeek)
      : []
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateWeek = useCallback((index: number, partial: Partial<EducationPlanWeek>) => {
    setContent((prev) => {
      const next = [...prev]
      if (!next[index]) return prev
      next[index] = { ...next[index], ...partial }
      return next
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const result = await updateAction(planId, {
        name: name.trim(),
        description: description.trim() || null,
        period_months: periodMonths,
        sessions_per_week: sessionsPerWeek,
        hours_per_session: hoursPerSession,
        audience: resolvedAudience || null,
        ...(content.length > 0 ? { content } : {}),
      })
      if (result.error) {
        setError(result.error)
        setSaving(false)
        return
      }
      router.push(`${planDetailBase}/${planId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : (L.failedToSave ?? 'Failed to save'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" />
        {L.backToPlans}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{L.editTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">{L.editSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">{L.detailsSchedule}</h2>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{L.planName}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder={L.planNamePlaceholder}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{L.descriptionOptional}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder={L.briefDescription}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{L.periodMonths}</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={periodMonths}
                  onChange={(e) => setPeriodMonths(Number(e.target.value) || 3)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{L.sessionsPerWeek}</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={sessionsPerWeek}
                  onChange={(e) => setSessionsPerWeek(Number(e.target.value) || 3)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{L.hoursPerSession}</label>
                <input
                  type="number"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={hoursPerSession}
                  onChange={(e) => setHoursPerSession(Number(e.target.value) || 2)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">{L.audience}</label>
                <select
                  value={audienceSelectValue}
                  onChange={(e) => setAudienceSelectValue(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  {audienceOptionsList.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {audienceSelectValue === '__other__' && (
                  <input
                    type="text"
                    value={audienceCustom}
                    onChange={(e) => setAudienceCustom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder={L.audiencePlaceholder}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {content.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <BookOpen className="h-4 w-4 text-blue-600" />
                {L.planContentWeekByWeek}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">{L.planContentHint}</p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
              {content.map((week, index) => (
                <div key={week.week} className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-semibold text-blue-700">
                      {week.week}
                    </span>
                    <input
                      type="text"
                      value={week.title ?? ''}
                      onChange={(e) => updateWeek(index, { title: e.target.value || undefined })}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      placeholder={L.weekTitlePlaceholder?.replace(/\{week\}/g, String(week.week)) ?? `Week ${week.week} title`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">{L.topicsPerLine}</label>
                    <textarea
                      value={(week.topics ?? []).join('\n')}
                      onChange={(e) =>
                        updateWeek(index, {
                          topics: e.target.value.split('\n').map((t) => t.trim()).filter(Boolean),
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder={L.oneTopicPerLine}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">{L.objectivesPerLine}</label>
                    <textarea
                      value={(week.objectives ?? []).join('\n')}
                      onChange={(e) =>
                        updateWeek(index, {
                          objectives: e.target.value.split('\n').map((t) => t.trim()).filter(Boolean),
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder={L.oneObjectivePerLine}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">{L.notesOptional}</label>
                    <input
                      type="text"
                      value={week.notes ?? ''}
                      onChange={(e) => updateWeek(index, { notes: e.target.value || undefined })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      placeholder={L.notesPlaceholder}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Link
            href={`${planDetailBase}/${planId}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {L.cancel}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {L.saveChanges}
          </button>
        </div>
      </form>
    </div>
  )
}
