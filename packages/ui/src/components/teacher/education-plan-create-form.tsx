'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2, Sparkles, FileText, BookOpen, Globe } from 'lucide-react'
import type { EducationPlanWeek } from '@eduator/core/types/education-plan'
import { CONTENT_LANGUAGES } from '@eduator/config/constants'

export const EDUCATION_PLAN_LANGUAGES = CONTENT_LANGUAGES

/** Selectable audience options (same style as course difficulty / other flows). */
export const EDUCATION_PLAN_AUDIENCE_OPTIONS = [
  { value: '', label: 'Select audience' },
  { value: 'Grade 1', label: 'Grade 1' },
  { value: 'Grade 2', label: 'Grade 2' },
  { value: 'Grade 3', label: 'Grade 3' },
  { value: 'Grade 4', label: 'Grade 4' },
  { value: 'Grade 5', label: 'Grade 5' },
  { value: 'Grade 6', label: 'Grade 6' },
  { value: 'Grade 7', label: 'Grade 7' },
  { value: 'Grade 8', label: 'Grade 8' },
  { value: 'Grade 9', label: 'Grade 9' },
  { value: 'Grade 10', label: 'Grade 10' },
  { value: 'Grade 11', label: 'Grade 11' },
  { value: 'Grade 12', label: 'Grade 12' },
  { value: 'Undergraduate', label: 'Undergraduate' },
  { value: 'Graduate', label: 'Graduate' },
  { value: 'PhD', label: 'PhD' },
  { value: '__other__', label: 'Other (custom)' },
] as const

export interface ClassOption {
  id: string
  name: string
}

export interface DocumentOption {
  id: string
  title: string
  file_type: string
}

export interface EducationPlanCreateFormLabels {
  backToPlans?: string
  createTitle?: string
  createSubtitle?: string
  basics?: string
  planName?: string
  classGroup?: string
  selectClass?: string
  descriptionOptional?: string
  briefDescription?: string
  schedule?: string
  periodMonths?: string
  sessionsPerWeek?: string
  hoursPerSession?: string
  audience?: string
  audiencePlaceholder?: string
  outputLanguage?: string
  outputLanguageHint?: string
  baseOnDocuments?: string
  baseOnDocumentsHint?: string
  noDocumentsYet?: string
  createPlanSection?: string
  generateWithAi?: string
  buildManually?: string
  planNamePlaceholder?: string
  planNameRequired?: string
  nameAndClassRequired?: string
  planGeneratedNotSaved?: string
  generateFailed?: string
  failedToCreatePlan?: string
  selectAudience?: string
  otherCustom?: string
}

const DEFAULT_CREATE_FORM_LABELS: EducationPlanCreateFormLabels = {
  backToPlans: 'Back to Education Plans',
  createTitle: 'Create Education Plan',
  createSubtitle: "Set up a curriculum plan for a class. Generate with AI (saved automatically) or build an empty plan and fill it in.",
  basics: 'Basics',
  planName: 'Plan name *',
  classGroup: 'Class / group (optional)',
  selectClass: 'Select a class (optional)',
  descriptionOptional: 'Description (optional)',
  briefDescription: 'Brief description of this plan',
  schedule: 'Schedule',
  periodMonths: 'Period (months)',
  sessionsPerWeek: 'Sessions/week',
  hoursPerSession: 'Hours/session',
  audience: 'Audience',
  audiencePlaceholder: 'e.g. Grade 10, Adult learners',
  outputLanguage: 'Output language',
  outputLanguageHint: 'AI will generate week titles, topics and objectives in this language.',
  baseOnDocuments: 'Base on documents (optional)',
  baseOnDocumentsHint: 'Select documents to align the plan content with. Leave empty for a general structure.',
  noDocumentsYet: 'No documents yet. Upload in Teaching Studio → Documents.',
  createPlanSection: 'Create plan',
  generateWithAi: 'Generate with AI (saved automatically)',
  buildManually: 'Build manually (empty template)',
  planNamePlaceholder: 'e.g. Algebra I — Fall 2025',
  planNameRequired: 'Plan name is required',
  nameAndClassRequired: 'Name and class are required',
  planGeneratedNotSaved: 'Plan was generated but could not be saved. Please try again.',
  generateFailed: 'Generate failed',
  failedToCreatePlan: 'Failed to create plan',
  selectAudience: 'Select audience',
  otherCustom: 'Other (custom)',
}

export interface EducationPlanCreateFormProps {
  /** e.g. "/api/teacher/education-plans/generate" */
  generateUrl: string
  /** Optional class-list endpoint, e.g. "/api/teacher/classes" */
  classesUrl?: string
  /** e.g. "/api/teacher/documents" */
  documentsUrl: string
  /** Server action: (params) => Promise<{ planId?: string | null; error?: string | null }> */
  createPlanAction: (params: {
    class_id: string | null
    name: string
    description?: string | null
    period_months: number
    sessions_per_week: number
    hours_per_session: number
    audience?: string | null
    document_ids: string[]
    content: EducationPlanWeek[]
    is_shared_with_students?: boolean
  }) => Promise<{ planId?: string | null; error?: string | null }>
  backHref: string
  /** (planId) => path to plan detail, e.g. (id) => `/teacher/education-plans/${id}` */
  planDetailHref: (planId: string) => string
  labels?: EducationPlanCreateFormLabels
  /** Translated audience dropdown options (value must match EDUCATION_PLAN_AUDIENCE_OPTIONS: '', 'Grade 1', ... '__other__') */
  audienceOptions?: Array<{ value: string; label: string }>
}

export function EducationPlanCreateForm({
  generateUrl,
  classesUrl,
  documentsUrl,
  createPlanAction,
  backHref,
  planDetailHref,
  labels = {},
  audienceOptions: audienceOptionsProp,
}: EducationPlanCreateFormProps) {
  const L = { ...DEFAULT_CREATE_FORM_LABELS, ...labels }
  const router = useRouter()
  const audienceOptionsList = audienceOptionsProp ?? EDUCATION_PLAN_AUDIENCE_OPTIONS.map((o) => ({
    value: o.value,
    label: o.value === '' ? (L.selectAudience ?? o.label) : o.value === '__other__' ? (L.otherCustom ?? o.label) : o.label,
  }))
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [documents, setDocuments] = useState<DocumentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [classId, setClassId] = useState('')
  const [description, setDescription] = useState('')
  const [periodMonths, setPeriodMonths] = useState(3)
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3)
  const [hoursPerSession, setHoursPerSession] = useState(2)
  const [audienceSelectValue, setAudienceSelectValue] = useState<string>('')
  const [audienceCustom, setAudienceCustom] = useState('')
  const [documentIds, setDocumentIds] = useState<string[]>([])
  const [language, setLanguage] = useState('az')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const classesPromise = classesUrl
          ? fetch(classesUrl).then((r) => (r.ok ? r.json() : { classes: [] }))
          : Promise.resolve({ classes: [] })
        const [classesRes, docsRes] = await Promise.all([
          classesPromise,
          fetch(documentsUrl).then((r) => (r.ok ? r.json() : { documents: [] })),
        ])
        setClasses(classesRes.classes || [])
        setDocuments(docsRes.documents || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [classesUrl, documentsUrl])

  const resolvedAudience =
    audienceSelectValue === '__other__' ? audienceCustom.trim() : audienceSelectValue

  const handleGenerate = async () => {
    if (!name.trim()) {
      setError(L.planNameRequired ?? 'Plan name is required')
      return
    }
    setError(null)
    setGenerating(true)
    try {
      const res = await fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId || null,
          document_ids: documentIds,
          period_months: periodMonths,
          sessions_per_week: sessionsPerWeek,
          hours_per_session: hoursPerSession,
          audience: resolvedAudience || undefined,
          class_name: classId ? classes.find((c) => c.id === classId)?.name : undefined,
          language: EDUCATION_PLAN_LANGUAGES.find((l) => l.code === language)?.name ?? 'English',
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generate failed')
      if (data.planId) {
        router.push(planDetailHref(data.planId))
        return
      }
      setError(L.planGeneratedNotSaved ?? 'Plan was generated but could not be saved. Please try again.')
    } catch (e) {
      setError(e instanceof Error ? e.message : (L.generateFailed ?? 'Generate failed'))
    } finally {
      setGenerating(false)
    }
  }

  const handleStartManual = async () => {
    if (!name.trim()) {
      setError(L.planNameRequired ?? 'Plan name is required')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const totalWeeks = Math.max(4, Math.min(52, periodMonths * 4))
      const empty: EducationPlanWeek[] = Array.from({ length: totalWeeks }, (_, i) => ({
        week: i + 1,
        title: `Week ${i + 1}`,
        topics: [],
        objectives: [],
      }))
      const result = await createPlanAction({
        class_id: classId,
        name: name.trim(),
        description: description.trim() || null,
        period_months: periodMonths,
        sessions_per_week: sessionsPerWeek,
        hours_per_session: hoursPerSession,
        audience: resolvedAudience || null,
        document_ids: documentIds,
        content: empty,
        is_shared_with_students: false,
      })
      if (result.planId) {
        router.push(planDetailHref(result.planId))
        return
      }
      setError(result.error || (L.failedToCreatePlan ?? 'Failed to create plan'))
    } catch (e) {
      setError(e instanceof Error ? e.message : (L.failedToCreatePlan ?? 'Failed to create plan'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" />
        {L.backToPlans}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{L.createTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {L.createSubtitle}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Basics */}
        <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">{L.basics}</h2>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{L.planName}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder={L.planNamePlaceholder}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{L.classGroup}</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{L.selectClass}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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
        </div>

        {/* Schedule */}
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">{L.schedule}</h2>
        </div>
        <div className="p-5">
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

        {/* Language */}
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-900">
            <Globe className="h-4 w-4 text-gray-500" />
            {L.outputLanguage}
          </h2>
          <p className="mt-1 text-xs text-gray-500">{L.outputLanguageHint}</p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {EDUCATION_PLAN_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  language === lang.code
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Image
                  src={`https://flagcdn.com/w40/${lang.countryCode.toLowerCase()}.png`}
                  alt=""
                  width={20}
                  height={15}
                  className="rounded-sm object-cover"
                  unoptimized
                />
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">{L.baseOnDocuments}</h2>
          <p className="mt-1 text-xs text-gray-500">{L.baseOnDocumentsHint}</p>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {documents.map((d) => (
              <label
                key={d.id}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                  documentIds.includes(d.id) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={documentIds.includes(d.id)}
                  onChange={(e) =>
                    setDocumentIds((prev) =>
                      e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id)
                    )
                  }
                  className="rounded border-gray-300"
                />
                <FileText className="h-4 w-4 flex-shrink-0 text-gray-500" />
                <span className="max-w-[200px] truncate text-sm">{d.title}</span>
              </label>
            ))}
            {documents.length === 0 && (
              <p className="text-sm text-gray-500">{L.noDocumentsYet}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900">{L.createPlanSection}</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {L.generateWithAi}
            </button>
            <button
              type="button"
              onClick={handleStartManual}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
              {L.buildManually}
            </button>
          </div>
        </div>
        {error && <p className="px-5 pb-5 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
