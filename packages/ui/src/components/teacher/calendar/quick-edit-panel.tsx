'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Clock, 
  FileText,
  GraduationCap,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle,
  Undo2
} from 'lucide-react'
import type { CalendarEvent } from './smart-calendar'

function toLocalDatetimeString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export interface QuickEditPanelLabels {
  editEvent: string
  updateScheduleDetails: string
  published: string
  unused: string
  scheduled: string
  titleLabel: string
  classLabel: string
  startTimeLabel: string
  endTimeLabel: string
  saveChanges: string
  saving: string
  unpublish: string
  reverting: string
  deleteEvent: string
  deleteConfirm: string
}

const DEFAULT_QUICK_EDIT_LABELS: QuickEditPanelLabels = {
  editEvent: 'Edit Event',
  updateScheduleDetails: 'Update schedule details',
  published: 'Published',
  unused: 'Unused',
  scheduled: 'Scheduled',
  titleLabel: 'Title',
  classLabel: 'Class',
  startTimeLabel: 'Start Time',
  endTimeLabel: 'End Time',
  saveChanges: 'Save Changes',
  saving: 'Saving...',
  unpublish: 'Unpublish (revert to draft)',
  reverting: 'Reverting...',
  deleteEvent: 'Delete Event',
  deleteConfirm: 'Are you sure you want to delete this scheduled event?',
}

export interface QuickEditPanelProps {
  event: CalendarEvent | null
  classes: Array<{ id: string; name: string }>
  labels?: Partial<QuickEditPanelLabels>
  onClose: () => void
  onSave?: (event: CalendarEvent, updates: Partial<CalendarEvent>) => Promise<void>
  onUnpublish?: (eventId: string) => Promise<void>
  onDelete?: (eventId: string) => Promise<void>
}

export function QuickEditPanel({
  event,
  classes,
  labels: labelsProp,
  onClose,
  onSave,
  onUnpublish,
  onDelete
}: QuickEditPanelProps) {
  const L = { ...DEFAULT_QUICK_EDIT_LABELS, ...labelsProp }
  const [isSaving, setIsSaving] = useState(false)
  const [isUnpublishing, setIsUnpublishing] = useState(false)
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    event ? [event.classId] : []
  )
  const [startTime, setStartTime] = useState(
    event ? toLocalDatetimeString(new Date(event.startTime)) : ''
  )
  const [endTime, setEndTime] = useState(
    event ? toLocalDatetimeString(new Date(event.endTime)) : ''
  )

  // Sync form when a different event is selected (e.g. open another event)
  useEffect(() => {
    if (event) {
      setSelectedClassIds([event.classId])
      setStartTime(toLocalDatetimeString(new Date(event.startTime)))
      setEndTime(toLocalDatetimeString(new Date(event.endTime)))
    }
  }, [event?.id, event?.classId, event?.startTime, event?.endTime])

  if (!event) return null

  const handleSave = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      const updates: Partial<CalendarEvent> = {
        classId: selectedClassIds[0] || event.classId,
        startTime: new Date(startTime),
        endTime: new Date(endTime)
      }
      await onSave(event, updates)
      onClose()
    } catch (error) {
      console.error('Error saving event:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || !confirm(L.deleteConfirm)) return

    try {
      await onDelete(event.id)
      onClose()
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const handleUnpublish = async () => {
    if (!onUnpublish) return

    setIsUnpublishing(true)
    try {
      await onUnpublish(event.id)
      onClose()
    } catch (error) {
      console.error('Error unpublishing event:', error)
    } finally {
      setIsUnpublishing(false)
    }
  }

  const getEventTypeIcon = () => {
    switch (event.type) {
      case 'exam':
        return <FileText className="h-5 w-5" />
      case 'lesson':
        return <GraduationCap className="h-5 w-5" />
      case 'document':
        return <FileText className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getStatusBadge = () => {
    switch (event.status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
            <CheckCircle className="h-3 w-3" />
            {L.published}
          </span>
        )
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
            <AlertCircle className="h-3 w-3" />
            {L.unused}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
            {L.scheduled}
          </span>
        )
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              {getEventTypeIcon()}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{L.editEvent}</h2>
              <p className="text-sm text-gray-500">{L.updateScheduleDetails}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        {getStatusBadge()}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Event Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {L.titleLabel}
          </label>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <p className="font-medium text-gray-900">{event.title}</p>
          </div>
        </div>

        {/* Class Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {L.classLabel}
          </label>
          <select
            value={selectedClassIds[0] || ''}
            onChange={(e) => setSelectedClassIds([e.target.value])}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        {/* Start Time (15-min steps) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="h-4 w-4 inline mr-1" />
            {L.startTimeLabel}
          </label>
          <input
            type="datetime-local"
            step={900}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          />
        </div>

        {/* End Time (15-min steps) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="h-4 w-4 inline mr-1" />
            {L.endTimeLabel}
          </label>
          <input
            type="datetime-local"
            step={900}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50 space-y-3">
        {event.status === 'published' && onUnpublish && (
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={isUnpublishing}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            {isUnpublishing ? (
              <>
                <div className="h-4 w-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                {L.reverting}
              </>
            ) : (
              <>
                <Undo2 className="h-4 w-4" />
                {L.unpublish}
              </>
            )}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {L.saving}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {L.saveChanges}
            </>
          )}
        </button>
        {onDelete && (
          <button
            onClick={handleDelete}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            {L.deleteEvent}
          </button>
        )}
      </div>
    </div>
  )
}
