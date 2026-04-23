'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, FileCode, File, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { UPLOAD_ERROR_USER_MESSAGE } from '@eduator/core/documents'

export interface DocumentUploadActions {
  quickUploadDocument: (input: { organizationId: string; file: File }) => Promise<{ error?: string; success?: boolean; data?: any }>
}

export interface DocumentUploadTranslations {
  dropFileHere: string
  dragDropFile: string
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

interface DocumentUploadZoneProps {
  organizationId: string
  onUpload: (input: { organizationId: string; file: File }) => Promise<{ error?: string; success?: boolean; data?: any }>
  onUploadSuccess?: (document: any) => void
  translations?: Partial<DocumentUploadTranslations>
}

export function DocumentUploadZone({ organizationId, onUpload, onUploadSuccess, translations }: DocumentUploadZoneProps) {
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
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      return t.uploadInvalidType
    }

    if (file.size > 15 * 1024 * 1024) {
      return t.uploadTooLarge
    }

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
      let result: { error?: string; success?: boolean; data?: any }
      try {
        result = await onUpload({
          organizationId,
          file,
        })
      } catch (err) {
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
        // Call success callback immediately if provided
        if (onUploadSuccess && result.data) {
          onUploadSuccess(result.data)
        }
        // Refresh router after a short delay to ensure DB transaction is committed
        // This prevents race conditions where the document might not be visible yet
        setTimeout(() => {
          router.refresh()
        }, 500)
        // Reset UI state after a brief delay
        setTimeout(() => {
          setUploadStatus('idle')
          setUploadedFileName(null)
        }, 1500)
      }
    })
  }, [organizationId, router, onUpload, onUploadSuccess])

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
    if (file) {
      handleUpload(file)
    }
  }, [handleUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
    // Reset input
    e.target.value = ''
  }, [handleUpload])

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return <FileText className="h-6 w-6 text-red-500" />
    if (ext === 'doc' || ext === 'docx') return <FileText className="h-6 w-6 text-blue-700" />
    if (ext === 'md' || ext === 'markdown') return <FileCode className="h-6 w-6 text-blue-500" />
    return <File className="h-6 w-6 text-gray-500" />
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-xl border-2 border-dashed transition-all duration-200
        ${isDragging 
          ? 'border-blue-500 bg-blue-50' 
          : uploadStatus === 'error'
            ? 'border-red-300 bg-red-50'
            : uploadStatus === 'success'
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
        }
      `}
    >
      <label className="flex cursor-pointer flex-col items-center justify-center px-6 py-8">
        {uploadStatus === 'idle' && (
          <>
            <div className={`
              flex h-14 w-14 items-center justify-center rounded-full transition-colors
              ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}
            `}>
              <Upload className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-medium text-gray-700">
              {isDragging ? t.dropFileHere : t.dragDropFile}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              or <span className="text-blue-600 hover:text-blue-700">{t.browseLabel}</span> {t.browseToUpload}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              {t.uploadFileTypes}
            </p>
          </>
        )}

        {uploadStatus === 'uploading' && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
              <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              {uploadedFileName && getFileIcon(uploadedFileName)}
              <p className="text-sm font-medium text-gray-700">{uploadedFileName}</p>
            </div>
            <p className="mt-1 text-xs text-blue-600">{t.uploading}</p>
          </>
        )}

        {uploadStatus === 'success' && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <p className="mt-4 text-sm font-medium text-green-700">
              {t.uploadSuccess}
            </p>
          </>
        )}

        {uploadStatus === 'error' && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
            <p className="mt-4 text-sm font-medium text-red-700">
              {errorMessage || t.uploadFailed}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {t.clickToRetry}
            </p>
          </>
        )}

        <input
          type="file"
          className="sr-only"
          accept=".pdf,.md,.markdown,.txt,.doc,.docx"
          onChange={handleFileSelect}
          disabled={isPending}
        />
      </label>
    </div>
  )
}
