'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X, Loader2, Trash2, FileText, AlertTriangle } from 'lucide-react'

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
  }) => Promise<{ error?: string; success?: boolean; data?: unknown }>
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
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await onUpdate({
        documentId: document.id,
        title: formData.title,
        description: formData.description || null,
      })

      if (result.error) {
        setError(result.error)
      } else {
        setIsOpen(false)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
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
        className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
        title={t.editDocument}
      >
        <Pencil className="h-4 w-4" />
      </button>

      {isOpen && !showDeleteConfirm ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="fixed inset-0 animate-in fade-in bg-black/60 duration-200" onClick={() => !isPending && setIsOpen(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <div className="overflow-hidden rounded-2xl bg-white border border-gray-200">
                <div className="bg-gray-900 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                        <FileText className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold">{t.editDocument}</h3>
                    </div>
                    <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} className="rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                ) : null}

                <form id="edit-document-form" onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
                  <div>
                    <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-gray-700">{t.editTitle}</label>
                    <input
                      type="text"
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      disabled={isPending}
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700">{t.editDescription}</label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm transition-all focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      disabled={isPending}
                    />
                  </div>
                </form>

                <div className="flex flex-col-reverse gap-3 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                    {t.editDeleteDocument}
                  </button>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsOpen(false)} disabled={isPending} className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:flex-none">
                      {t.editCancel}
                    </button>
                    <button type="submit" form="edit-document-form" disabled={isPending} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-70 sm:flex-none">
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
      ) : null}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="fixed inset-0 animate-in fade-in bg-black/60 duration-200" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
              <div className="overflow-hidden rounded-2xl bg-white border border-gray-200">
                <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="absolute right-4 top-4 z-10 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50">
                  <X className="h-5 w-5" />
                </button>

                <div className="p-6 sm:p-8">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <h3 className="mb-2 text-center text-xl font-bold text-gray-900">{t.editDeleteTitle}</h3>
                  <p className="text-center text-sm leading-relaxed text-gray-600 sm:text-base">
                    {t.editDeleteConfirm.replace('{title}', document.title)}
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 bg-gray-50 px-6 py-4 sm:flex-row sm:px-8">
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50">
                    {t.editCancel}
                  </button>
                  <button type="button" onClick={handleDelete} disabled={isDeleting} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-black focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-70">
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
      ) : null}
    </>
  )
}
