'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Share2, Loader2, Check, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { updateEducationPlan } from '../actions'
import type { EducationPlanWeek } from '@eduator/core/types/education-plan'

interface Props {
  planId: string
  content: EducationPlanWeek[]
  isShared: boolean
  deleteAction: (planId: string) => Promise<{ success?: boolean; error?: string | null }>
}

export function EducationPlanViewClient({ planId, content, isShared, deleteAction }: Props) {
  const t = useTranslations('teacherEducationPlans')
  const router = useRouter()
  const [shared, setShared] = useState(isShared)
  const [updating, setUpdating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const toggleShare = async () => {
    setUpdating(true)
    const result = await updateEducationPlan(planId, { is_shared_with_students: !shared })
    if (result.error) {
      setUpdating(false)
      return
    }
    setShared(!shared)
    setUpdating(false)
    router.refresh()
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteAction(planId)
      if (result.success) {
        setShowDeleteConfirm(false)
        router.push('/school-admin/education-plans')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm text-gray-600">
          {t('shareHint')}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={`/school-admin/education-plans/${planId}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4" />
            {t('edit')}
          </Link>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            {t('delete')}
          </button>
          <button
            type="button"
            onClick={toggleShare}
            disabled={updating}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {shared ? t('sharedBtn') : t('shareWithLearnersBtn')}
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isPending && setShowDeleteConfirm(false)} aria-hidden />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="p-6 sm:p-8">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-center text-xl font-bold text-gray-900">{t('deletePlanTitle')}</h3>
                <p className="text-center text-sm text-gray-600">{t('deletePlanConfirm')}</p>
              </div>
              <div className="flex gap-3 bg-gray-50 px-6 py-4 sm:px-8">
                <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={isPending} className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">{t('cancel')}</button>
                <button type="button" onClick={handleDelete} disabled={isPending} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-70">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {isPending ? t('deleting') : t('deletePlanBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
        {(content || []).map((week) => (
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

