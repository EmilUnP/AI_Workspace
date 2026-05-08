'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, FileCode, File, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const UPLOAD_ERROR_USER_MESSAGE = 'Upload failed. Please try again.'

export interface DocumentUploadTranslations {
  dropFileHere: string
  dragDropFile: string
  uploadOr: string
  browseLabel: string
  browseToUpload: string
  uploadFileTypes: string
  uploading: string
  uploadSuccess: string
  uploadFailed: string
  clickToRetry: string
  uploadInvalidType: string
  uploadTooLarge: string
}

const DEFAULT_UPLOAD_TRANSLATIONS: DocumentUploadTranslations = {
  dropFileHere: 'Drop file here',
  dragDropFile: 'Drag & drop a file here',
  uploadOr: 'or',
  browseLabel: 'browse',
  browseToUpload: 'to upload',
  uploadFileTypes: 'PDF, Word (.doc, .docx), Markdown, or Text up to 15MB',
  uploading: 'Uploading...',
  uploadSuccess: 'Upload successful!',
  uploadFailed: 'Upload failed',
  clickToRetry: 'Click to try again',
  uploadInvalidType: 'Please upload a PDF, Word (.doc, .docx), Markdown (.md), or Text (.txt) file',
  uploadTooLarge: 'File size must be 15MB or less',
}

interface UploadResult {
  error?: string
  success?: boolean
  data?: Record<string, unknown>
}

interface DocumentUploadZoneProps {
  workspaceId: string
  onUpload: (input: { organizationId: string; file: File }) => Promise<UploadResult>
  onUploadSuccess?: (document: Record<string, unknown>) => void
  translations?: Partial<DocumentUploadTranslations>
}

export function DocumentUploadZone({ workspaceId, onUpload, onUploadSuccess, translations }: DocumentUploadZoneProps) {
  const t: DocumentUploadTranslations = { ...DEFAULT_UPLOAD_TRANSLATIONS, ...translations }
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['application/pdf', 'text/markdown', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const allowedExtensions = ['.pdf', '.md', '.txt', '.markdown', '.doc', '.docx']
    const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) return t.uploadInvalidType
    if (file.size > 15 * 1024 * 1024) return t.uploadTooLarge
    return null
  }

  const handleUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setUploadStatus('error')
      setErrorMessage(validationError)
      setTimeout(() => {
        setUploadStatus('idle')
        setErrorMessage(null)
      }, 3000)
      return
    }

    setUploadStatus('uploading')
    setUploadedFileName(file.name)
    setErrorMessage(null)

    startTransition(async () => {
      let result: UploadResult
      try {
        result = await onUpload({ organizationId: workspaceId, file })
      } catch {
        setUploadStatus('error')
        setErrorMessage(UPLOAD_ERROR_USER_MESSAGE)
        setTimeout(() => {
          setUploadStatus('idle')
          setErrorMessage(null)
          setUploadedFileName(null)
        }, 3000)
        return
      }

      if (result.error) {
        setUploadStatus('error')
        setErrorMessage(result.error)
        setTimeout(() => {
          setUploadStatus('idle')
          setErrorMessage(null)
          setUploadedFileName(null)
        }, 3000)
      } else {
        setUploadStatus('success')
        if (onUploadSuccess && result.data) onUploadSuccess(result.data)
        setTimeout(() => router.refresh(), 500)
        setTimeout(() => {
          setUploadStatus('idle')
          setUploadedFileName(null)
        }, 1500)
      }
    })
  }, [workspaceId, router, onUpload, onUploadSuccess, t.uploadInvalidType, t.uploadTooLarge])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ''
  }, [handleUpload])

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return <FileText className="h-6 w-6 text-gray-700" />
    if (ext === 'doc' || ext === 'docx') return <FileText className="h-6 w-6 text-gray-700" />
    if (ext === 'md' || ext === 'markdown') return <FileCode className="h-6 w-6 text-gray-700" />
    return <File className="h-6 w-6 text-gray-500" />
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
        isDragging ? 'border-gray-500 bg-gray-100' :
        uploadStatus === 'error' ? 'border-gray-400 bg-gray-100' :
        uploadStatus === 'success' ? 'border-gray-400 bg-gray-100' :
        'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100/70'
      }`}
    >
      <label className="flex cursor-pointer flex-col items-center justify-center px-6 py-8">
        {uploadStatus === 'idle' ? (
          <>
            <div className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${isDragging ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-400'}`}>
              <Upload className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-medium text-gray-700">{isDragging ? t.dropFileHere : t.dragDropFile}</p>
            <p className="mt-1 text-xs text-gray-500">{t.uploadOr} <span className="text-gray-700 hover:text-gray-900">{t.browseLabel}</span> {t.browseToUpload}</p>
            <p className="mt-2 text-xs text-gray-400">{t.uploadFileTypes}</p>
          </>
        ) : null}

        {uploadStatus === 'uploading' ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200">
              <Loader2 className="h-7 w-7 animate-spin text-gray-700" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              {uploadedFileName ? getFileIcon(uploadedFileName) : null}
              <p className="text-sm font-medium text-gray-700">{uploadedFileName}</p>
            </div>
            <p className="mt-1 text-xs text-gray-700">{t.uploading}</p>
          </>
        ) : null}

        {uploadStatus === 'success' ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200">
              <CheckCircle className="h-7 w-7 text-gray-700" />
            </div>
            <p className="mt-4 text-sm font-medium text-gray-800">{t.uploadSuccess}</p>
          </>
        ) : null}

        {uploadStatus === 'error' ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200">
              <AlertCircle className="h-7 w-7 text-gray-700" />
            </div>
            <p className="mt-4 text-sm font-medium text-gray-800">{errorMessage || t.uploadFailed}</p>
            <p className="mt-1 text-xs text-gray-500">{t.clickToRetry}</p>
          </>
        ) : null}

        <input type="file" className="sr-only" accept=".pdf,.md,.markdown,.txt,.doc,.docx" onChange={handleFileSelect} disabled={isPending} />
      </label>
    </div>
  )
}
