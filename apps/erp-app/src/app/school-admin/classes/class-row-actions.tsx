'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Trash2, 
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Users,
  Loader2
} from 'lucide-react'
import { deleteClass, toggleClassStatus } from './actions'
import Link from 'next/link'
import { EditClassButton } from './edit-class-button'

interface ClassRowActionsProps {
  classId: string
  className: string
  description: string | null
  isActive: boolean
}

export function ClassRowActions({ classId, className, description, isActive }: ClassRowActionsProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleToggleStatus = async () => {
    startTransition(async () => {
      await toggleClassStatus(classId, !isActive)
      router.refresh()
    })
  }

  const handleDelete = async () => {
    startTransition(async () => {
      await deleteClass(classId)
      setShowDeleteConfirm(false)
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Manage Class Button */}
        <Link
          href={`/school-admin/classes/${classId}`}
          className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
          title="Manage Class"
        >
          <Users className="h-4 w-4" />
        </Link>

        {/* Edit Button */}
        <EditClassButton
          classData={{
            id: classId,
            name: className,
            description: description,
            is_active: isActive,
          }}
          variant="icon"
        />

        {/* Toggle Status Button */}
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={isPending}
          className={`flex items-center justify-center h-8 w-8 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isActive 
              ? 'text-gray-600 hover:text-amber-600 hover:bg-amber-50' 
              : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
          }`}
          title={isActive ? 'Deactivate Class' : 'Activate Class'}
        >
          {isActive ? (
            <ToggleLeft className="h-4 w-4" />
          ) : (
            <ToggleRight className="h-4 w-4" />
          )}
        </button>

        {/* Delete Button */}
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete Class"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isPending && setShowDeleteConfirm(false)}
          />
          
          {/* Dialog Container */}
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Content */}
                <div className="p-6 sm:p-8">
                  {/* Icon */}
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-5">
                    <AlertTriangle className="h-8 w-8" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                    Delete Class
                  </h3>

                  {/* Message */}
                  <p className="text-gray-600 text-center text-sm sm:text-base leading-relaxed">
                    Are you sure you want to delete <strong className="font-semibold">{className}</strong>? This will also remove all student enrollments. This action cannot be undone.
                  </p>
                </div>

                {/* Actions */}
                <div className="bg-gray-50 px-6 py-4 sm:px-8 flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isPending}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-70"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete Class
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
