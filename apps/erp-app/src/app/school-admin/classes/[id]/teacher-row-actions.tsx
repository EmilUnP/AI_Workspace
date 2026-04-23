'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserMinus, Loader2 } from 'lucide-react'
import { removeTeacherFromClass } from './actions'

interface TeacherRowActionsProps {
  classId: string
  teacherId: string
  teacherName: string
}

export function TeacherRowActions({ classId, teacherId, teacherName }: TeacherRowActionsProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleRemove = async () => {
    startTransition(async () => {
      await removeTeacherFromClass(classId, teacherId)
      setShowConfirm(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        title="Remove from class"
      >
        <UserMinus className="h-4 w-4" />
      </button>

      {/* Remove Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isPending && setShowConfirm(false)}
          />
          
          {/* Dialog Container */}
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Content */}
                <div className="p-6 sm:p-8">
                  {/* Icon */}
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-5">
                    <UserMinus className="h-8 w-8" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                    Remove Teacher
                  </h3>

                  {/* Message */}
                  <p className="text-gray-600 text-center text-sm sm:text-base leading-relaxed">
                    Are you sure you want to remove <strong className="font-semibold">{teacherName}</strong> from this class? They can be re-assigned later.
                  </p>
                </div>

                {/* Actions */}
                <div className="bg-gray-50 px-6 py-4 sm:px-8 flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    disabled={isPending}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-70"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <UserMinus className="h-4 w-4" />
                        Remove Teacher
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
