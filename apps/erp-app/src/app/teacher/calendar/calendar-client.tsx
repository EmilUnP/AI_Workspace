'use client'

import dynamic from 'next/dynamic'
import type { CalendarEvent, DraftMaterial, TeacherCalendarHubLabels } from '@eduator/ui'
import { scheduleMaterial, updateScheduledEvent, deleteScheduledEvent, confirmMaterial, unpublishMaterial } from './actions'
import { useRouter } from 'next/navigation'
import { useState, useCallback, startTransition } from 'react'

const TeacherCalendarHub = dynamic(
  () => import('@eduator/ui').then((m) => m.TeacherCalendarHub),
  { ssr: false, loading: () => <div className="animate-pulse rounded-lg bg-gray-200 min-h-[480px]" /> }
)

interface CalendarClientProps {
  events: CalendarEvent[]
  drafts: DraftMaterial[]
  classes: Array<{ id: string; name: string }>
  labels?: Partial<TeacherCalendarHubLabels>
}

export function CalendarClient({ events, drafts, classes, labels }: CalendarClientProps) {
  const router = useRouter()
  const [viewDate, setViewDate] = useState(() => new Date())

  const handleScheduleMaterial = async (
    materialId: string,
    type: 'exam' | 'lesson',
    startTime: Date,
    endTime: Date,
    classIds: string[]
  ) => {
    const result = await scheduleMaterial(materialId, type, startTime, endTime, classIds)
    if (result.success) {
      router.refresh()
    }
  }

  const handleUpdateEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    const event = events.find(e => e.id === eventId)
    if (!event) return

    // Only handle exam and lesson types
    if (event.type !== 'exam' && event.type !== 'lesson') {
      console.warn('Update not supported for document type events')
      return
    }

    const result = await updateScheduledEvent(eventId, event.type, {
      startTime: updates.startTime,
      endTime: updates.endTime,
      classId: updates.classId
    })

    if (result.success) {
      startTransition(() => router.refresh())
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId)
    if (!event) return

    // Only handle exam and lesson types
    if (event.type !== 'exam' && event.type !== 'lesson') {
      console.warn('Delete not supported for document type events')
      return
    }

    const result = await deleteScheduledEvent(eventId, event.type)
    if (result.success) {
      startTransition(() => router.refresh())
    }
  }

  const handleConfirmWeek = useCallback(async (eventIds: string[]) => {
    for (const eventId of eventIds) {
      const event = events.find(e => e.id === eventId)
      if (!event || (event.type !== 'exam' && event.type !== 'lesson')) continue
      await confirmMaterial(event.materialId, event.type)
    }
    startTransition(() => router.refresh())
  }, [events, router])

  const handleUnpublishEvent = useCallback(async (eventId: string) => {
    const event = events.find(e => e.id === eventId)
    if (!event || (event.type !== 'exam' && event.type !== 'lesson')) return
    const result = await unpublishMaterial(event.materialId, event.type)
    if (result.success) {
      startTransition(() => router.refresh())
    }
  }, [events, router])

  return (
    <TeacherCalendarHub
      events={events}
      drafts={drafts}
      classes={classes}
      labels={labels}
      currentDate={viewDate}
      onDateChange={setViewDate}
      onScheduleMaterial={handleScheduleMaterial}
      onUpdateEvent={handleUpdateEvent}
      onDeleteEvent={handleDeleteEvent}
      onUnpublishEvent={handleUnpublishEvent}
      onConfirmWeek={handleConfirmWeek}
    />
  )
}
