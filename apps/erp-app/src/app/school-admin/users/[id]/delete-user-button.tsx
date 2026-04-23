'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2, AlertTriangle, X } from 'lucide-react'
import { deleteUser } from './actions'

interface DeleteUserButtonProps {
  userId: string
  userName: string
}

export function DeleteUserButton({ userId, userName }: DeleteUserButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      await deleteUser(userId)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        <Trash2 className="h-4 w-4" />
        Delete User
      </button>

      {/* Confirmation Modal */}
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
                {/* Close Button */}
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isPending}
                  className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 z-10"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="p-6 sm:p-8">
                  {/* Icon */}
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-5">
                    <AlertTriangle className="h-8 w-8" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                    Delete User
                  </h3>

                  {/* Message */}
                  <p className="text-gray-600 text-center text-sm sm:text-base leading-relaxed">
                    Are you sure you want to delete <strong className="font-semibold">{userName}</strong>? This action cannot be undone and the user will lose access to their account.
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
                        Delete User
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
