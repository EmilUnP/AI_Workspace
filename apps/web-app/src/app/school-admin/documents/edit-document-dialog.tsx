'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, X } from 'lucide-react'

export function EditDocumentDialog({
  document,
  onUpdate,
  onDelete,
}: {
  document: { id: string; title: string; description?: string | null; tags?: string[] | null }
  onUpdate: (input: { documentId: string; title: string; description?: string | null; tags?: string[] | null }) => Promise<{ error?: string; success?: boolean }>
  onDelete: (documentId: string) => Promise<{ error?: string; success?: boolean }>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [title, setTitle] = useState(document.title)
  const [description, setDescription] = useState(document.description || '')
  const [tags, setTags] = useState((document.tags || []).join(', '))

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
        <Pencil className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Edit document</h3>
          <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" rows={3} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" placeholder="tag1, tag2" />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await onDelete(document.id)
                if (result.error) return setError(result.error)
                setOpen(false)
                router.refresh()
              })
            }
            className="inline-flex items-center gap-1 rounded border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700">
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError('')
                  const result = await onUpdate({
                    documentId: document.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    tags: tags
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                  if (result.error) return setError(result.error)
                  setOpen(false)
                  router.refresh()
                })
              }
              className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

