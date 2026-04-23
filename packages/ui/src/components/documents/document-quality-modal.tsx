'use client'

import { X, Info, CheckCircle, AlertTriangle, XCircle, Globe } from 'lucide-react'

export interface QualityModalTranslations {
  qualityDocumentInfo: string
  qualityDocument: string
  qualityContentLanguage: string
  qualityContentLanguageHint: string
  qualityProcessing: string
  qualityGood: string
  qualityGoodDescription: string
  qualityLow: string
  qualityLowDescription: string
  qualityFailedLimited: string
  qualityFailedDescription: string
  qualityProcessingStatus: string
  qualityProcessingHint: string
  qualityPendingUnknown: string
  qualityRagStats: string
  qualityTokens: string
  qualityChunks: string
  qualityTokensPerChunk: string
}

const DEFAULT_QUALITY_TRANSLATIONS: QualityModalTranslations = {
  qualityDocumentInfo: 'Document info',
  qualityDocument: 'Document',
  qualityContentLanguage: 'Content language',
  qualityContentLanguageHint: 'Detected automatically. Used for cross-language RAG query translation.',
  qualityProcessing: 'Quality & processing',
  qualityGood: 'Good',
  qualityGoodDescription: 'Text was extracted and chunked successfully. This document is suitable for exams and lessons.',
  qualityLow: 'Low quality',
  qualityLowDescription: 'AI-generated content may be less accurate. Prefer documents with selectable text and fewer images.',
  qualityFailedLimited: 'Failed / limited',
  qualityFailedDescription: 'This document may not be used reliably for generating exams or lessons. Try re-uploading a PDF with selectable text.',
  qualityProcessingStatus: 'Processing…',
  qualityProcessingHint: 'Quality will be available shortly.',
  qualityPendingUnknown: 'Pending or unknown.',
  qualityRagStats: 'RAG stats',
  qualityTokens: 'Tokens',
  qualityChunks: 'Chunks',
  qualityTokensPerChunk: '~Tokens/chunk',
}

export interface DocumentQualityModalProps {
  document: {
    title: string
    file_type: string
    file_size: number
    processing_status?: string | null
    processing_error_message?: string | null
    quality_status?: string | null
    quality_message?: string | null
    total_tokens?: number | null
    chunk_count?: number | null
    avg_chunk_size?: number | null
    content_language?: string | null
  }
  onClose: () => void
  translations?: Partial<QualityModalTranslations>
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function DocumentQualityModal({ document, onClose, translations }: DocumentQualityModalProps) {
  const t: QualityModalTranslations = { ...DEFAULT_QUALITY_TRANSLATIONS, ...translations }
  const quality = document.quality_status ?? (document.processing_status === 'failed' ? 'failed' : null)
  const hasError = document.processing_status === 'failed' || document.processing_error_message

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl"
        role="dialog"
        aria-labelledby="document-quality-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-gray-500" />
            <h2 id="document-quality-title" className="font-semibold text-gray-900">
              {t.qualityDocumentInfo}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div>
            <p className="text-sm font-medium text-gray-500">{t.qualityDocument}</p>
            <p className="mt-0.5 font-medium text-gray-900">{document.title}</p>
            <p className="text-sm text-gray-500">
              {document.file_type.toUpperCase()} · {formatFileSize(document.file_size)}
            </p>
          </div>

          {/* Content language */}
          {document.content_language && (
            <div>
              <p className="text-sm font-medium text-gray-500">{t.qualityContentLanguage}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-900 capitalize">{document.content_language}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t.qualityContentLanguageHint}
              </p>
            </div>
          )}

          {/* Quality / processing status */}
          <div>
            <p className="text-sm font-medium text-gray-500">{t.qualityProcessing}</p>
            <div className="mt-2 space-y-2">
              {quality === 'good' && (
                <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{t.qualityGood}</p>
                    <p className="text-xs text-green-700">
                      {t.qualityGoodDescription}
                    </p>
                  </div>
                </div>
              )}
              {quality === 'low_quality' && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">{t.qualityLow}</p>
                    {document.quality_message && (
                      <p className="text-xs text-amber-700">{document.quality_message}</p>
                    )}
                    <p className="mt-1 text-xs text-amber-700">
                      {t.qualityLowDescription}
                    </p>
                  </div>
                </div>
              )}
              {(quality === 'failed' || hasError) && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                  <XCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">{t.qualityFailedLimited}</p>
                    {(document.processing_error_message || document.quality_message) && (
                      <p className="text-xs text-red-700">
                        {document.processing_error_message || document.quality_message}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-red-700">
                      {t.qualityFailedDescription}
                    </p>
                  </div>
                </div>
              )}
              {!quality && document.processing_status === 'processing' && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm font-medium text-blue-800">{t.qualityProcessingStatus}</p>
                  <p className="text-xs text-blue-700">{t.qualityProcessingHint}</p>
                </div>
              )}
              {!quality && document.processing_status !== 'processing' && !hasError && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm text-gray-600">{t.qualityPendingUnknown}</p>
                </div>
              )}
            </div>
          </div>

          {/* RAG stats when available */}
          {(document.total_tokens != null || document.chunk_count != null) && (
            <div>
              <p className="text-sm font-medium text-gray-500">{t.qualityRagStats}</p>
              <div className="mt-2 flex gap-4 text-sm">
                {document.total_tokens != null && (
                  <div>
                    <span className="text-gray-500">{t.qualityTokens} </span>
                    <span className="font-medium text-gray-900">{document.total_tokens.toLocaleString()}</span>
                  </div>
                )}
                {document.chunk_count != null && document.chunk_count > 0 && (
                  <div>
                    <span className="text-gray-500">{t.qualityChunks} </span>
                    <span className="font-medium text-gray-900">{document.chunk_count}</span>
                  </div>
                )}
                {document.avg_chunk_size != null && document.avg_chunk_size > 0 && (
                  <div>
                    <span className="text-gray-500">{t.qualityTokensPerChunk} </span>
                    <span className="font-medium text-gray-900">
                      {Math.round(document.avg_chunk_size / 4).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
