'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Edit, 
  Volume2, 
  Loader2, 
  X,
  Save,
  RefreshCw,
  CheckCircle,
  Trash2,
} from 'lucide-react'

export interface LessonActionsLabels {
  edit?: string
  generateAudio?: string
  regenerateAudio?: string
  deleteLesson?: string
  editLesson?: string
  cancel?: string
  saveChanges?: string
  saving?: string
  titleLabel?: string
  topicLabel?: string
  descriptionLabel?: string
  durationLabel?: string
  contentLabel?: string
  titlePlaceholder?: string
  topicPlaceholder?: string
  descriptionPlaceholder?: string
  contentPlaceholder?: string
  deleteConfirmTitle?: string
  deleteConfirmMessage?: string
  deleting?: string
}

export interface LessonActionsProps {
  lessonId: string
  title: string
  topic?: string | null
  description?: string | null
  content: string
  durationMinutes?: number | null
  isPublished: boolean
  hasAudio: boolean
  onUpdateLesson: (lessonId: string, input: {
    title?: string
    topic?: string
    description?: string
    content?: string
    duration_minutes?: number
  }) => Promise<{ error?: string; success?: boolean }>
  onRegenerateAudio: (lessonId: string) => Promise<{ error?: string; success?: boolean }>
  onDeleteLesson: (lessonId: string) => Promise<{ error?: string; success?: boolean }>
  labels?: LessonActionsLabels
}

const DEFAULT_ACTIONS_LABELS: LessonActionsLabels = {
  edit: 'Edit',
  generateAudio: 'Generate audio',
  regenerateAudio: 'Regenerate audio',
  deleteLesson: 'Delete lesson',
  editLesson: 'Edit Lesson',
  cancel: 'Cancel',
  saveChanges: 'Save Changes',
  saving: 'Saving...',
  titleLabel: 'Title',
  topicLabel: 'Topic',
  descriptionLabel: 'Description',
  durationLabel: 'Duration (minutes)',
  contentLabel: 'Content',
  titlePlaceholder: 'Lesson title',
  topicPlaceholder: 'Main topic of the lesson',
  descriptionPlaceholder: 'Brief description of the lesson',
  contentPlaceholder: 'Lesson content...',
  deleteConfirmTitle: 'Delete Lesson',
  deleteConfirmMessage: 'Are you sure you want to delete this lesson? This action cannot be undone.',
  deleting: 'Deleting...',
}

export function LessonActions({
  lessonId,
  title: initialTitle,
  topic: initialTopic,
  description: initialDescription,
  content: initialContent,
  durationMinutes: initialDuration,
  hasAudio,
  onUpdateLesson,
  onRegenerateAudio,
  onDeleteLesson,
  labels = {},
}: LessonActionsProps) {
  const L = { ...DEFAULT_ACTIONS_LABELS, ...labels }
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [topic, setTopic] = useState(initialTopic || '')
  const [description, setDescription] = useState(initialDescription || '')
  const [content, setContent] = useState(initialContent)
  const [duration, setDuration] = useState(initialDuration || 45)
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  // Audio regeneration state
  const [isRegeneratingAudio, setIsRegeneratingAudio] = useState(false)
  const [audioSuccess, setAudioSuccess] = useState(false)
  
  // Error state
  const [error, setError] = useState<string | null>(null)

  const handleSaveEdit = async () => {
    setError(null)
    startTransition(async () => {
      const result = await onUpdateLesson(lessonId, {
        title,
        topic: topic || undefined,
        description: description || undefined,
        content,
        duration_minutes: duration,
      })
      
      if (result.error) {
        setError(result.error)
      } else {
        setShowEditModal(false)
        router.refresh()
      }
    })
  }

  const handleRegenerateAudio = async () => {
    setError(null)
    setIsRegeneratingAudio(true)
    setAudioSuccess(false)
    
    try {
      const result = await onRegenerateAudio(lessonId)
      if (result.error) {
        setError(result.error)
      } else {
        setAudioSuccess(true)
        setTimeout(() => setAudioSuccess(false), 3000)
        router.refresh()
      }
    } catch (err) {
      setError('Failed to regenerate audio')
    } finally {
      setIsRegeneratingAudio(false)
    }
  }

  const handleDelete = async () => {
    setError(null)
    startTransition(async () => {
      const result = await onDeleteLesson(lessonId)
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/teacher/lessons')
      }
    })
  }

  return (
    <>
      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Regenerate Audio Button */}
        <button
          onClick={handleRegenerateAudio}
          disabled={isRegeneratingAudio || isPending}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
            audioSuccess
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'
          } disabled:opacity-50`}
          title={hasAudio ? L.regenerateAudio : L.generateAudio}
        >
          {isRegeneratingAudio ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : audioSuccess ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Edit Button */}
        <button
          onClick={() => setShowEditModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Edit className="w-4 h-4" />
          <span className="hidden sm:inline">{L.edit}</span>
        </button>

        {/* Delete Button */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          title={L.deleteLesson}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowEditModal(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{L.editLesson}</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {L.titleLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder={L.titlePlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {L.topicLabel}
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder={L.topicPlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {L.descriptionLabel}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                  placeholder={L.descriptionPlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {L.durationLabel}
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 45)}
                  min={5}
                  max={180}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {L.contentLabel}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none font-mono"
                  placeholder={L.contentPlaceholder}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 rounded-b-2xl px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {L.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isPending || !title.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {L.saving}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {L.saveChanges}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{L.deleteConfirmTitle}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {L.deleteConfirmMessage}
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {L.cancel}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {L.deleting}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    {L.deleteConfirmTitle}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
