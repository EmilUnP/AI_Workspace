'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  X, 
  Loader2, 
  BookOpen,
  Save
} from 'lucide-react'
import { updateClass } from './actions'

interface ClassData {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

interface EditClassDialogProps {
  classData: ClassData
  isOpen: boolean
  onClose: () => void
}

export function EditClassDialog({ classData, isOpen, onClose }: EditClassDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await updateClass(classData.id, formData)
      
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
        router.refresh()
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !isPending && onClose()}
      />
      
      {/* Dialog Container */}
      <div className="min-h-full flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-700 p-5 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Edit Class</h2>
                <p className="text-purple-100 text-sm">Update class information</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form id="edit-class-form" onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Class Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Class Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={classData.name}
              className="block w-full rounded-xl border border-gray-300 py-2.5 px-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
              placeholder="e.g., Class 10A, Section B"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={classData.description || ''}
              className="block w-full rounded-xl border border-gray-300 py-2.5 px-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none transition-all"
              placeholder="Brief description of the class..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        {/* Actions */}
        <div className="bg-gray-50 px-5 py-4 sm:px-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-class-form"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-medium text-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
