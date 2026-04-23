'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  X, 
  Loader2, 
  BookOpen
} from 'lucide-react'

export interface AddClassDialogLabels {
  createNewClass?: string
  createNewClassSubtitle?: string
  addClassSubtitle?: string
  classNameLabel?: string
  classNamePlaceholder?: string
  descriptionLabel?: string
  descriptionPlaceholder?: string
  cancel?: string
  creating?: string
  creatingShort?: string
  createClassBtn?: string
  createBtnShort?: string
}

const DEFAULT_DIALOG_LABELS: AddClassDialogLabels = {
  createNewClass: 'Create New Class',
  createNewClassSubtitle: 'Create a new class',
  addClassSubtitle: 'Add a class to your organization',
  classNameLabel: 'Class Name',
  classNamePlaceholder: 'e.g., Class 10A, Section B',
  descriptionLabel: 'Description',
  descriptionPlaceholder: 'Brief description of the class...',
  cancel: 'Cancel',
  creating: 'Creating...',
  creatingShort: 'Creating',
  createClassBtn: 'Create Class',
  createBtnShort: 'Create',
}

export interface AddClassDialogProps {
  onCreateClass: (formData: FormData) => Promise<{ error?: string; success?: boolean; classId?: string }>
  variant?: 'erp'
  isOpen?: boolean
  onClose?: () => void
  trigger?: React.ReactNode
  labels?: AddClassDialogLabels
}

export function AddClassDialog({ 
  onCreateClass, 
  variant = 'erp',
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  trigger,
  labels = {},
}: AddClassDialogProps) {
  const L = { ...DEFAULT_DIALOG_LABELS, ...labels }
  const router = useRouter()
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = controlledOnClose ? () => controlledOnClose() : setInternalIsOpen

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await onCreateClass(formData)
      
      if (result.error) {
        setError(result.error)
      } else {
        setIsOpen(false)
        router.refresh()
      }
    })
  }

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false)
      setError(null)
    }
  }

  return (
    <>
      {/* Button is only shown when not controlled and trigger is provided */}
      {!controlledIsOpen && trigger && (
        <div onClick={() => setIsOpen(true)}>
          {trigger}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleClose}
          />
          
          {/* Dialog Container */}
          <div className="min-h-full flex items-center justify-center p-3 sm:p-4">
            <div className="relative w-full max-w-lg bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-violet-700 p-4 sm:p-5 lg:p-6 text-white flex-shrink-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-lg font-bold truncate">{L.createNewClass}</h2>
                      <p className="text-purple-100 text-xs sm:text-sm truncate">
                        {variant === 'erp' ? L.addClassSubtitle : L.createNewClassSubtitle}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form id="add-class-form" onSubmit={handleSubmit} className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
                {/* Class Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {L.classNameLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="block w-full rounded-xl border border-gray-300 py-2.5 px-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                    placeholder={L.classNamePlaceholder}
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {L.descriptionLabel}
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="block w-full rounded-xl border border-gray-300 py-2.5 px-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none transition-all"
                    placeholder={L.descriptionPlaceholder}
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
              <div className="bg-gray-50 px-4 sm:px-5 lg:px-6 py-3 sm:py-4 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-xs sm:text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {L.cancel}
                </button>
                <button
                  type="submit"
                  form="add-class-form"
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-orange-600 text-white font-medium text-xs sm:text-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-70 transition-colors"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      <span className="hidden sm:inline">{L.creating}</span>
                      <span className="sm:hidden">{L.creatingShort}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{L.createClassBtn}</span>
                      <span className="sm:hidden">{L.createBtnShort}</span>
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
