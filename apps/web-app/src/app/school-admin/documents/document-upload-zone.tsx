'use client'

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Loader2, Upload } from 'lucide-react'

type UploadResult = { error?: string; success?: boolean; data?: Record<string, unknown> }

export function DocumentUploadZone({
  workspaceId,
  onUpload,
  onUploadSuccess,
}: {
  workspaceId: string
  onUpload: (input: { organizationId: string; file: File }) => Promise<UploadResult>
  onUploadSuccess?: (document: Record<string, unknown>) => void
}) {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  const validate = (file: File) => {
    const allowed = ['.pdf', '.md', '.markdown', '.txt', '.doc', '.docx']
    const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`
    if (!allowed.includes(ext)) return 'Invalid file type'
    if (file.size > 15 * 1024 * 1024) return 'File must be 15MB or smaller'
    return null
  }

  const submitFile = useCallback(
    (file: File) => {
      const error = validate(file)
      if (error) {
        setStatus('error')
        setMessage(error)
        return
      }
      setStatus('uploading')
      setMessage('')
      startTransition(async () => {
        const result = await onUpload({ organizationId: workspaceId, file })
        if (result.error || !result.success) {
          setStatus('error')
          setMessage(result.error || 'Upload failed')
          return
        }
        setStatus('success')
        if (result.data) onUploadSuccess?.(result.data)
        setTimeout(() => router.refresh(), 400)
        setTimeout(() => {
          setStatus('idle')
          setMessage('')
        }, 1400)
      })
    },
    [onUpload, onUploadSuccess, router, workspaceId]
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setIsDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) submitFile(file)
      }}
      className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
        isDragging ? 'border-gray-700 bg-gray-50' : 'border-gray-300 bg-white'
      }`}
    >
      <label className="cursor-pointer">
        {status === 'idle' && (
          <>
            <Upload className="mx-auto h-8 w-8 text-gray-500" />
            <p className="mt-3 text-sm font-medium text-gray-700">Drag and drop a file here</p>
            <p className="mt-1 text-xs text-gray-500">or click to browse (.pdf/.doc/.docx/.md/.txt)</p>
          </>
        )}
        {status === 'uploading' && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-700" />
            <p className="mt-3 text-sm font-medium text-gray-700">Uploading...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto h-8 w-8 text-green-600" />
            <p className="mt-3 text-sm font-medium text-green-700">Upload successful</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
            <p className="mt-3 text-sm font-medium text-red-700">{message || 'Upload failed'}</p>
          </>
        )}
        <input
          type="file"
          className="sr-only"
          accept=".pdf,.md,.markdown,.txt,.doc,.docx"
          disabled={isPending}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) submitFile(file)
            e.target.value = ''
          }}
        />
      </label>
    </div>
  )
}

