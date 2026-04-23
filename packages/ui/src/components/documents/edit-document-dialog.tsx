'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2, Trash2, FileText, AlertTriangle } from 'lucide-react'

export interface DocumentActions {
  updateDocument: (input: {
    documentId: string
    title: string
    description?: string | null
    tags?: string[] | null
  }) => Promise<{ error?: string; success?: boolean; data?: any }>
  deleteDocument: (documentId: string) => Promise<{ error?: string; success?: boolean }>
}

export interface EditDocumentTranslations {
  editDocument: string
  editTitle: string
  editDescription: string
  editTags: string
  editTagsPlaceholder: string
  editDeleteDocument: string
  editCancel: string
  editSaving: string
  editSaveChanges: string
  editDeleteTitle: string
  editDeleteConfirm: string
  editDeleting: string
}

const DEFAULT_EDIT_TRANSLATIONS: EditDocumentTranslations = {
  editDocument: 'Edit Document',
  editTitle: 'Title',
  editDescription: 'Description',
  editTags: 'Tags',
  editTagsPlaceholder: 'Comma-separated tags',
  editDeleteDocument: 'Delete Document',
  editCancel: 'Cancel',
  editSaving: 'Saving...',
  editSaveChanges: 'Save Changes',
  editDeleteTitle: 'Delete Document',
  editDeleteConfirm: 'Are you sure you want to delete "{title}"? This action cannot be undone and the file will be permanently removed.',
  editDeleting: 'Deleting...',
}

interface EditDocumentDialogProps {
  document: {
    id: string
    title: string
    description?: string | null
    tags?: string[] | null
  }
  onUpdate: (input: {
    documentId: string
    title: string
    description?: string | null
    tags?: string[] | null
  }) => Promise<{ error?: string; success?: boolean; data?: any }>
  onDelete: (documentId: string) => Promise<{ error?: string; success?: boolean }>
  translations?: Partial<EditDocumentTranslations>
}

export function EditDocumentDialog({ document, onUpdate, onDelete, translations }: EditDocumentDialogProps) {
  const t: EditDocumentTranslations = { ...DEFAULT_EDIT_TRANSLATIONS, ...translations }
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    title: document.title,
    description: document.description || '',
    tags: document.tags?.join(', ') || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await onUpdate({
        documentId: document.id,
        title: formData.title,
        description: formData.description || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setIsOpen(false)
        router.refresh()
      }
    })
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    startTransition(async () => {
      const result = await onDelete(document.id)

      if (result.error) {
        setError(result.error)
        setIsDeleting(false)
        setShowDeleteConfirm(false)
      } else {
        setIsOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-gray-600 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        title={t.editDocument}
      >
        <Pencil className="h-4 w-4" />
      </button>

      {/* Edit Dialog */}
      {isOpen && !showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isPending && setIsOpen(false)}
          />

          {/* Dialog Container */}
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <FileText className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold">{t.editDocument}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      disabled={isPending}
                      className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mx-4 mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Edit Form */}
                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t.editTitle}
                    </label>
                    <input
                      type="text"
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      disabled={isPending}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t.editDescription}
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none transition-all"
                      disabled={isPending}
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1.5">
                      {t.editTags}
                    </label>
                    <input
                      type="text"
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder={t.editTagsPlaceholder}
                      disabled={isPending}
                    />
                  </div>
                </form>

                {/* Actions */}
                <div className="bg-gray-50 px-5 py-4 sm:px-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t.editDeleteDocument}
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      disabled={isPending}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      {t.editCancel}
                    </button>
                    <button
                      type="submit"
                      form="edit-form"
                      onClick={handleSubmit as any}
                      disabled={isPending}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-70 transition-colors"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t.editSaving}
                        </>
                      ) : (
                        t.editSaveChanges
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />

          {/* Dialog Container */}
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Close Button */}
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
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
                    {t.editDeleteTitle}
                  </h3>

                  {/* Message */}
                  <p className="text-gray-600 text-center text-sm sm:text-base leading-relaxed">
                    {t.editDeleteConfirm.replace(/#TITLE#/g, document.title)}
                  </p>
                </div>

                {/* Actions */}
                <div className="bg-gray-50 px-6 py-4 sm:px-8 flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors disabled:opacity-50"
                  >
                    {t.editCancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-70"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t.editDeleting}</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>{t.editDeleteDocument}</span>
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
