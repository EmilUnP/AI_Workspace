'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, Pencil, Trash2, Loader2, AlertTriangle, X } from 'lucide-react'

export interface EducationPlanRowActionsLabels {
  viewPlan?: string
  editPlan?: string
  deletePlanTitle?: string
  deletePlanConfirm?: string
  cancel?: string
  deleting?: string
  deletePlanBtn?: string
  close?: string
}

const DEFAULT_ROW_ACTIONS_LABELS: EducationPlanRowActionsLabels = {
  viewPlan: 'View plan',
  editPlan: 'Edit plan',
  deletePlanTitle: 'Delete plan',
  deletePlanConfirm: 'Are you sure you want to delete this education plan?',
  cancel: 'Cancel',
  deleting: 'Deleting...',
  deletePlanBtn: 'Delete plan',
  close: 'Close',
}

export interface EducationPlanRowActionsProps {
  planId: string
  viewHref: string
  editHref: string
  deleteAction: (planId: string) => Promise<{ success?: boolean; error?: string | null }>
  labels?: EducationPlanRowActionsLabels
}

export function EducationPlanRowActions({
  planId,
  viewHref,
  editHref,
  deleteAction,
  labels = {},
}: EducationPlanRowActionsProps) {
  const L = { ...DEFAULT_ROW_ACTIONS_LABELS, ...labels }
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [actionType, setActionType] = useState<'delete' | null>(null)

  const handleDelete = () => {
    setActionType('delete')
    startTransition(async () => {
      const result = await deleteAction(planId)
      if (result.success) {
        setShowDeleteConfirm(false)
        router.refresh()
      }
      setActionType(null)
    })
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Link
          href={viewHref}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
          title={L.viewPlan}
        >
          <Eye className="h-4 w-4" />
        </Link>
        <Link
          href={editHref}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
          title={L.editPlan}
        >
          <Pencil className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isPending}
          className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          title={L.deletePlanTitle}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div
            className="fixed inset-0 animate-in fade-in bg-black/60 backdrop-blur-sm duration-200"
            onClick={() => !isPending && setShowDeleteConfirm(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Escape' && !isPending && setShowDeleteConfirm(false)}
            aria-label={L.close}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="absolute right-4 top-4 z-10 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="p-6 sm:p-8">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-center text-xl font-bold text-gray-900">{L.deletePlanTitle}</h3>
                  <p className="text-center text-sm leading-relaxed text-gray-600 sm:text-base">
                    {L.deletePlanConfirm}
                  </p>
                </div>
                <div className="flex flex-col-reverse gap-3 bg-gray-50 px-6 py-4 sm:flex-row sm:px-8">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isPending}
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {L.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-70"
                  >
                    {isPending && actionType === 'delete' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{L.deleting}</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>{L.deletePlanBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
