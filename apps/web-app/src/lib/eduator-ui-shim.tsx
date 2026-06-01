'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, Eye, Loader2, Trash2, X } from 'lucide-react'

type AnyProps = Record<string, any>

function Placeholder({ children }: { children?: ReactNode }) {
  return <>{children ?? null}</>
}

export function AppErrorBoundary({ error, reset }: { error: Error; reset: () => void; variant?: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm">{error?.message || 'Unexpected application error'}</p>
      <button type="button" onClick={reset} className="mt-4 rounded-md bg-red-700 px-3 py-2 text-sm text-white">
        Try again
      </button>
    </div>
  )
}

export function GlobalErrorBoundary({ error, reset }: { error: Error; reset: () => void; variant?: string }) {
  return <AppErrorBoundary error={error} reset={reset} />
}

export function PaginationFooter(_props: AnyProps) {
  return null
}

export function LessonRowActions() { return null }
export function EducationPlanRowActions(props: AnyProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const labels = (props?.labels || {}) as Record<string, string>
  const t = (key: string, fallback: string) => labels[key] || fallback

  const handleDelete = async () => {
    if (!props?.deleteAction || typeof props.deleteAction !== 'function') return
    setIsDeleting(true)
    try {
      const result = await props.deleteAction(String(props.planId || ''))
      if (!result?.error) {
        window.location.reload()
      }
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <a
          href={String(props?.viewHref || '#')}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title={t('viewPlan', 'View plan')}
        >
          <Eye className="h-4 w-4" />
        </a>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          title={t('deletePlanBtn', 'Delete')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => !isDeleting && setShowDeleteConfirm(false)} aria-hidden />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 ring-1 ring-gray-200 sm:p-8">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                aria-label={t('close', 'Close')}
              >
                <X className="h-5 w-5" />
              </button>
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 ring-1 ring-gray-200/70">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">{t('deletePlanTitle', 'Delete plan')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{t('deletePlanConfirm', 'Are you sure you want to delete this plan?')}</p>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-70"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('deleting', 'Deleting...')}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>{t('deletePlanBtn', 'Delete')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
export function EducationPlanCreateForm(props: AnyProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [periodMonths, setPeriodMonths] = useState(3)
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3)
  const [hoursPerSession, setHoursPerSession] = useState(1)
  const [language, setLanguage] = useState('en')
  const [documents, setDocuments] = useState<AnyProps[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const labels = (props?.labels || {}) as Record<string, string>
  const t = (key: string, fallback: string) => labels[key] || fallback

  useEffect(() => {
    const load = async () => {
      if (!props?.documentsUrl) return
      try {
        const response = await fetch(String(props.documentsUrl), { cache: 'no-store' })
        if (!response.ok) return
        const payload = (await response.json()) as { items?: AnyProps[]; documents?: AnyProps[] }
        setDocuments(Array.isArray(payload.items) ? payload.items : Array.isArray(payload.documents) ? payload.documents : [])
      } catch {
        setDocuments([])
      }
    }
    void load()
  }, [props?.documentsUrl])

  const handleGenerate = async () => {
    if (!props?.generateUrl) return
    if (!name.trim()) {
      setError(t('planNameRequired', 'Plan name is required'))
      return
    }
    if (!selectedDocumentId) {
      setError(t('selectOneDocumentRequired', 'Please select a source document.'))
      return
    }

    setError(null)
    setIsGenerating(true)
    try {
      const response = await fetch(String(props.generateUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocumentId,
          name: name.trim(),
          description: description.trim() || undefined,
          language,
          periodMonths,
          sessionsPerWeek,
          hoursPerSession,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as AnyProps
      if (!response.ok) {
        setError(String(payload?.error || t('generateFailed', 'Failed to generate plan')))
        return
      }
      if (payload?.plan?.id) {
        const href = typeof props?.planDetailHref === 'function'
          ? props.planDetailHref(String(payload.plan.id))
          : `/school-admin/education-plans/${String(payload.plan.id)}`
        window.location.href = href
        return
      }
      setError(t('generateFailed', 'Failed to generate plan'))
    } catch {
      setError(t('generateFailed', 'Failed to generate plan'))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <h2 className="text-xl font-semibold text-gray-900">{t('createTitle', 'Create education plan')}</h2>
      <p className="mt-1 text-sm text-gray-500">{t('createSubtitle', 'Generate a weekly plan from a selected source document')}</p>

      <div className="mt-5 space-y-5">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Basics</h3>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{t('planName', 'Plan name')} *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('planNamePlaceholder', 'Plan name')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{t('descriptionOptional', 'Description (optional)')}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('briefDescription', 'Description')} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300" />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t('schedule', 'Schedule')}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{t('periodMonths', 'Period (months)')}</label>
              <input type="number" min={1} max={24} value={periodMonths} onChange={(e) => setPeriodMonths(Math.max(1, Number(e.target.value || 1)))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{t('sessionsPerWeek', 'Sessions/week')}</label>
              <input type="number" min={1} max={14} value={sessionsPerWeek} onChange={(e) => setSessionsPerWeek(Math.max(1, Number(e.target.value || 1)))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{t('hoursPerSession', 'Hours/session')}</label>
              <input type="number" min={1} max={8} value={hoursPerSession} onChange={(e) => setHoursPerSession(Math.max(1, Number(e.target.value || 1)))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">{t('outputLanguage', 'Output language')}</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300">
                <option value="en">English</option>
                <option value="az">Azerbaijani</option>
                <option value="tr">Turkish</option>
                <option value="ru">Russian</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t('baseOnDocuments', 'Source document')}</h3>
          <label className="text-sm font-medium text-gray-700">
            {t('selectOneDocument', 'Select one document')}
            <span className="text-red-600 font-normal ml-1">*</span>
          </label>
          <p className="text-xs text-gray-500">{t('baseOnDocumentsHint', 'A source document is required.')}</p>
          <select value={selectedDocumentId} onChange={(e) => setSelectedDocumentId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300">
            <option value="">{t('chooseDocument', 'Choose document')}</option>
            {documents.map((doc) => (
              <option key={String(doc.id)} value={String(doc.id)}>
                {String(doc.title || doc.file_name || 'Untitled')}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            {documents.length} {t('availableDocumentsSuffix', 'available document(s)')}
          </p>
        </section>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={handleGenerate} disabled={isGenerating} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50">
          {isGenerating ? 'Generating...' : t('generateWithAi', 'Generate with AI')}
        </button>
      </div>
    </div>
  )
}
export function AITutor() { return null }
export function LessonTabs() { return null }
export function AudioPlayer() { return null }
export function LessonActions() { return null }
export function RichTextWithMath({ children }: { children?: ReactNode }) { return <>{children ?? null}</> }
export function ExamCreator(props: AnyProps) {
  const tr = (key: string, fallback: string) => String(props?.translations?.[key] || fallback)
  const [title, setTitle] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [questionCount, setQuestionCount] = useState(10)
  const [generateLanguage, setGenerateLanguage] = useState('en')
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [topicEntries, setTopicEntries] = useState<Array<{ name: string; count?: number }>>([])
  const [questionTypeDistribution, setQuestionTypeDistribution] = useState({
    multiple_choice: 50,
    true_false: 20,
    multiple_select: 20,
    fill_blank: 10,
  })
  const [difficultyDistribution, setDifficultyDistribution] = useState({
    easy: 30,
    medium: 50,
    hard: 20,
  })

  const documents = Array.isArray(props?.documents) ? props.documents : []

  const rebalance = (
    current: Record<string, number>,
    changedKey: string,
    nextValueRaw: number,
    keys: string[]
  ): Record<string, number> => {
    const nextValue = Math.max(0, Math.min(100, Math.floor(nextValueRaw)))
    const out: Record<string, number> = { ...current, [changedKey]: nextValue }
    const others = keys.filter((k) => k !== changedKey)
    const remaining = 100 - nextValue
    const sumOthers = others.reduce((s, k) => s + (current[k] || 0), 0)

    if (remaining <= 0) {
      others.forEach((k) => { out[k] = 0 })
      return out
    }
    if (sumOthers <= 0) {
      const per = Math.floor(remaining / others.length)
      let extra = remaining - per * others.length
      others.forEach((k) => {
        out[k] = per + (extra > 0 ? 1 : 0)
        if (extra > 0) extra -= 1
      })
      return out
    }

    const provisional = others.map((k) => {
      const raw = (current[k] / sumOthers) * remaining
      return { k, value: Math.floor(raw), rem: raw - Math.floor(raw) }
    })
    let assigned = provisional.reduce((s, i) => s + i.value, 0)
    let left = remaining - assigned
    provisional.sort((a, b) => b.rem - a.rem)
    let idx = 0
    while (left > 0 && provisional.length > 0) {
      provisional[idx % provisional.length].value += 1
      idx += 1
      left -= 1
    }
    provisional.forEach((i) => { out[i.k] = i.value })
    return out
  }

  const handleGenerate = async () => {
    if (!props?.onGenerateExam || typeof props.onGenerateExam !== 'function') {
      setError(tr('generateActionUnavailable', 'Generate action is unavailable.'))
      return
    }
    const topics = topicEntries.map((x) => x.name.trim()).filter(Boolean)
    if (selectedDocumentIds.length === 0) {
      setError(tr('selectAtLeastOneDocument', 'Please select at least one document.'))
      return
    }
    setIsGenerating(true)
    setError(null)
    setMessage(null)
    try {
      const result = await props.onGenerateExam({
        documentIds: selectedDocumentIds,
        organizationId: String(props?.organizationId || 'global'),
        title: title.trim() || undefined,
        questionCount,
        durationMinutes,
        difficulty: 'mixed',
        language: generateLanguage,
        topics,
        topicQuestionCounts: topicEntries.map((x) => x.count),
        questionTypes: questionTypeDistribution,
        difficultyLevels: difficultyDistribution,
      })
      if (result?.error) {
        setError(String(result.error))
        return
      }
      if (result?.examId) {
        window.location.href = `/school-admin/exams/${String(result.examId)}`
        return
      }
      setMessage(tr('questionsGenerated', 'Questions generated. You can now save exam.'))
    } catch {
      setError(tr('generateExamFailed', 'Failed to generate exam.'))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900">{tr('aiGenerateTitle', 'AI Generate')}</h2>
      <p className="mt-1 text-sm text-gray-500">{tr('aiGenerateSubtitle', 'Create questions from selected documents')}</p>

      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">{tr('examTitle', 'Exam title')}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={tr('examTitlePlaceholder', 'e.g. Network Operating Systems - Midterm')}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
        />
        <p className="mt-1 text-xs text-gray-500">{tr('examTitleHint', 'Leave empty to auto-generate from selected documents.')}</p>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
            {tr('selectDocuments', 'Select documents')}
            <span className="text-red-600 font-normal normal-case ml-1">*</span>
          </label>
          <p className="mb-2 text-xs text-gray-500">{tr('selectDocumentsRequiredHint', 'At least one document is required.')}</p>
          <div className="max-h-36 overflow-auto rounded-lg border border-gray-200 bg-white">
            <div className="divide-y divide-gray-100">
              {documents.length === 0 ? (
                <p className="p-3 text-xs text-gray-500">{tr('noDocumentsAvailable', 'No documents available.')}</p>
              ) : (
                documents.map((doc: AnyProps) => {
                  const id = String(doc?.id || '')
                  const checked = selectedDocumentIds.includes(id)
                  return (
                    <label key={id} className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                      <div className="flex min-w-0 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedDocumentIds((prev) =>
                              e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                            )
                          }}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-gray-700 focus:ring-gray-400"
                        />
                        <span className="truncate">{String(doc?.title || tr('untitled', 'Untitled'))}</span>
                      </div>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                        {String(doc?.file_type || 'text')}
                      </span>
                    </label>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-700">{tr('topicsOptional', 'Topics (Optional)')}</p>
            <button
              type="button"
              onClick={() => setTopicEntries((prev) => [...prev, { name: '', count: undefined }])}
              className="text-xs font-medium text-gray-700 hover:text-gray-900"
            >
              {tr('addTopic', '+ Add Topic')}
            </button>
          </div>
          {topicEntries.length === 0 ? (
            <p className="text-xs text-gray-500">{tr('topicsHint', 'Leave empty to generate from all document content.')}</p>
          ) : (
            <div className="space-y-2">
              {topicEntries.map((entry, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-4">
                  <input
                    value={entry.name}
                    onChange={(e) => {
                      const value = e.target.value
                      setTopicEntries((prev) => prev.map((x, i) => (i === index ? { ...x, name: value } : x)))
                    }}
                    placeholder={tr('topicNamePlaceholder', 'Topic name')}
                    className="sm:col-span-3 rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={entry.count ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        const value = raw ? Math.max(1, Number(raw)) : undefined
                        setTopicEntries((prev) => prev.map((x, i) => (i === index ? { ...x, count: value } : x)))
                      }}
                    placeholder={tr('questionCountShort', 'Q#')}
                      className="w-full rounded-lg border border-gray-300 px-2 py-2 text-xs outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setTopicEntries((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded-lg border border-red-200 px-2 text-xs text-red-600 hover:bg-red-50"
                    >
                      x
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">{tr('language', 'Language')}</label>
            <select
              value={generateLanguage}
              onChange={(e) => setGenerateLanguage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            >
              <option value="en">English</option>
              <option value="az">Azerbaijani</option>
              <option value="tr">Turkish</option>
              <option value="ru">Russian</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">{tr('totalQuestions', 'Total Questions')}</label>
            <input
              type="number"
              min={1}
              max={50}
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.max(1, Math.min(50, Number(e.target.value || 10))))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">{tr('minutes', 'Minutes')}</label>
            <input
              type="number"
              min={5}
              max={300}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value || 60))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{tr('questionTypes', 'Question types')}</p>
                <span className="text-[11px] font-semibold text-gray-500">
                  {questionTypeDistribution.multiple_choice + questionTypeDistribution.true_false + questionTypeDistribution.multiple_select + questionTypeDistribution.fill_blank}%
                </span>
              </div>
              {([
                ['multiple_choice', tr('multipleChoice', 'Multiple Choice')],
                ['true_false', tr('trueFalse', 'True/False')],
                ['multiple_select', tr('multipleSelect', 'Multiple Select')],
                ['fill_blank', tr('fillBlank', 'Fill in the Blank')],
              ] as const).map(([key, label]) => (
                <div key={key} className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-xs text-gray-600">{label}</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={questionTypeDistribution[key]}
                      onChange={(e) => setQuestionTypeDistribution(rebalance(questionTypeDistribution, key, Number(e.target.value), ['multiple_choice', 'true_false', 'multiple_select', 'fill_blank']) as typeof questionTypeDistribution)}
                      className="w-14 rounded-md border border-gray-300 px-2 py-1 text-right text-xs outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{tr('difficultyLevels', 'Difficulty levels')}</p>
                <span className="text-[11px] font-semibold text-gray-500">
                  {difficultyDistribution.easy + difficultyDistribution.medium + difficultyDistribution.hard}%
                </span>
              </div>
              {([
                ['easy', tr('difficultyEasy', 'Easy')],
                ['medium', tr('difficultyMedium', 'Medium')],
                ['hard', tr('difficultyHard', 'Hard')],
              ] as const).map(([key, label]) => (
                <div key={key} className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-xs text-gray-600">{label}</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={difficultyDistribution[key]}
                      onChange={(e) => setDifficultyDistribution(rebalance(difficultyDistribution, key, Number(e.target.value), ['easy', 'medium', 'hard']) as typeof difficultyDistribution)}
                      className="w-14 rounded-md border border-gray-300 px-2 py-1 text-right text-xs outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
          >
            {isGenerating ? tr('generating', 'Generating...') : tr('generateQuestions', 'Generate Questions')}
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-gray-700">{message}</p> : null}
    </div>
  )
}

export async function exportQuestionsToCsv(_questions: unknown[], _fileName?: string) {
  return
}

export type QuestionType = string
export type Question = Record<string, any>
export type ExamCreatorTranslations = Record<string, string>
export type ExamCreatorProps = AnyProps
export const DEFAULT_EXAM_CREATOR_TRANSLATIONS: ExamCreatorTranslations = {
  generateActionUnavailable: 'Generate action is unavailable.',
  selectAtLeastOneDocument: 'Please select at least one document.',
  selectDocumentsRequiredHint: 'At least one document is required.',
  questionsGenerated: 'Questions generated. You can now save exam.',
  generateExamFailed: 'Failed to generate exam.',
  aiGenerateTitle: 'AI Generate',
  aiGenerateSubtitle: 'Create questions from documents',
  examTitle: 'Exam title',
  examTitlePlaceholder: 'e.g. Network Operating Systems - Midterm',
  examTitleHint: 'Leave empty to auto-generate from selected documents.',
  selectDocuments: 'Select documents',
  noDocumentsAvailable: 'No documents available.',
  untitled: 'Untitled',
  topicsOptional: 'Topics (Optional)',
  addTopic: '+ Add Topic',
  topicsHint: 'Leave empty to generate from all document content.',
  topicNamePlaceholder: 'Topic name',
  questionCountShort: 'Q#',
  language: 'Language',
  totalQuestions: 'Total Questions',
  minutes: 'Minutes',
  questionTypes: 'Question types',
  multipleChoice: 'Multiple Choice',
  trueFalse: 'True/False',
  multipleSelect: 'Multiple Select',
  fillBlank: 'Fill in the Blank',
  difficultyLevels: 'Difficulty levels',
  difficultyEasy: 'Easy',
  difficultyMedium: 'Medium',
  difficultyHard: 'Hard',
  generating: 'Generating...',
  generateQuestions: 'Generate Questions',
}

export type DocumentUploadTranslations = Record<string, string>
export type DocumentsExplorerTranslations = Record<string, string>

export function useDocumentsList(initialDocuments: any[] = []) {
  const [documents, setDocuments] = useState<any[]>(initialDocuments)

  return {
    documents,
    addDocument: (doc: any) => {
      setDocuments((prev) => [doc, ...prev])
    },
    updateDocument: (id: string, doc: any) => {
      setDocuments((prev) => prev.map((item) => (String(item?.id) === id ? { ...item, ...doc } : item)))
    },
    removeDocument: (id: string) => {
      setDocuments((prev) => prev.filter((item) => String(item?.id) !== id))
    },
  }
}

export function DocumentUploadZone(props: AnyProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async () => {
    if (!props?.onUpload || typeof props.onUpload !== 'function') return
    setIsSubmitting(true)
    setMessage(null)
    try {
      const payload = {
        title: title.trim() || file?.name || 'Untitled document',
        description: description.trim() || undefined,
        file: file ?? undefined,
      }
      const result = await props.onUpload(payload)
      if (result?.success) {
        setTitle('')
        setDescription('')
        setFile(null)
        setMessage('Document created successfully.')
        if (props?.onUploadSuccess) {
          props.onUploadSuccess(result.data || payload)
        }
      } else {
        setMessage(result?.error || 'Upload failed.')
      }
    } catch {
      setMessage('Upload failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">Upload Document</h3>
      <p className="mt-1 text-sm text-gray-600">Add files and create document records in the new backend.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
        />
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="mt-3 min-h-[88px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Uploading...' : 'Upload'}
        </button>
        {message ? <p className="text-sm text-gray-600">{message}</p> : null}
      </div>
    </div>
  )
}

export function DocumentsExplorer(props: AnyProps) {
  const docs = Array.isArray(props?.initialDocuments) ? props.initialDocuments : []
  const totalSize = docs.reduce((acc: number, doc: Record<string, unknown>) => acc + Number(doc.file_size || 0), 0)
  const formatBytes = (value: number) => {
    if (!value) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    let size = value
    let i = 0
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024
      i += 1
    }
    return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
      <p className="mt-1 text-xs text-gray-500">
        {docs.length} file{docs.length === 1 ? '' : 's'} - {formatBytes(totalSize)}
      </p>
      {docs.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No documents found.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {docs.map((doc: Record<string, unknown>) => (
            <div key={String(doc.id || Math.random())} className="rounded-md border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{String(doc.title || 'Untitled')}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">{String(doc.file_name || doc.fileName || '')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{String(doc.file_type || 'text').toUpperCase()}</p>
                  <p className="text-xs text-gray-500">{formatBytes(Number(doc.file_size || 0))}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Card({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>{children}</div>
}

export function CardHeader({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <h3 className={`text-base font-semibold ${className}`}>{children}</h3>
}

export function CardDescription({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <p className={`text-sm text-gray-500 ${className}`}>{children}</p>
}

export function CardContent({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`p-4 pt-0 ${className}`}>{children}</div>
}

export function Button({ children, className = '', ...props }: AnyProps) {
  return (
    <button {...props} className={`rounded-md bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-800 ${className}`}>
      {children}
    </button>
  )
}

export function BarChart(_props: AnyProps) { return <Placeholder /> }
export function LineChart(_props: AnyProps) { return <Placeholder /> }
export function HorizontalBarChart(_props: AnyProps) { return <Placeholder /> }
