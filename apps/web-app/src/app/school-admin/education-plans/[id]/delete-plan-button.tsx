'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'

type Props = {
  planId: string
  deleteAction: (planId: string) => Promise<{ success?: boolean; error?: string | null }>
  labels: {
    delete: string
    deletePlanTitle: string
    deletePlanConfirm: string
    cancel: string
    deleting: string
    deletePlanBtn: string
  }
}

export function DeletePlanButton({ planId, deleteAction, labels }: Props) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

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
    <>
      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
      >
        <Trash2 className="h-4 w-4" />
        {labels.delete}
      </button>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60" onClick={() => !isPending && setShowDeleteConfirm(false)} aria-hidden />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white ring-1 ring-gray-200">
              <div className="p-6 sm:p-8">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-center text-xl font-bold text-gray-900">{labels.deletePlanTitle}</h3>
                <p className="text-center text-sm text-gray-600">{labels.deletePlanConfirm}</p>
              </div>
              <div className="flex gap-3 bg-gray-50 px-6 py-4 sm:px-8">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {labels.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-black disabled:opacity-70"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {isPending ? labels.deleting : labels.deletePlanBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
