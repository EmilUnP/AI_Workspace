'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock, Sun } from 'lucide-react'

export interface CalendarEvent {
  id: string
  type: 'exam' | 'lesson' | 'document'
  title: string
  classId: string
  className: string
  startTime: Date
  endTime: Date
  status: 'published' | 'draft' | 'scheduled'
  materialId: string
  studentCount?: number
  activeStudents?: number
  color?: string
  // Optional source for distinguishing manual vs course/AI generated content
  source?: 'manual' | 'course' | 'ai'
  /** When true, event is a final exam (scheduled from Final Exams) and uses a distinct color. */
  isFinalExam?: boolean
}

export interface SmartCalendarLabels {
  dayNames: [string, string, string, string, string, string, string]
  previousWeek: string
  nextWeek: string
  today: string
  view24h: string
  viewWorkingHours: string
  showAll24Hours: string
  typeExam: string
  typeLesson: string
  typeFinalExam: string
  typeDoc: string
  typeItem: string
  eventSingular: string
  eventsCount: string
  unused: string
}

const DEFAULT_SMART_CALENDAR_LABELS: SmartCalendarLabels = {
  dayNames: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  previousWeek: 'Previous week',
  nextWeek: 'Next week',
  today: 'Today',
  view24h: '24h',
  viewWorkingHours: 'Working hours (9–18)',
  showAll24Hours: 'Show all 24 hours',
  typeExam: 'Exam',
  typeLesson: 'Lesson',
  typeFinalExam: 'Final exam',
  typeDoc: 'Doc',
  typeItem: 'Item',
  eventSingular: 'event',
  eventsCount: 'events',
  unused: 'Unused',
}

export interface SmartCalendarProps {
  events: CalendarEvent[]
  classes?: Array<{ id: string; name: string }>
  labels?: Partial<SmartCalendarLabels>
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (date: Date, hour: number) => void
  onEventDrop?: (eventId: string, newStartTime: Date, newEndTime: Date) => void
  onMaterialDrop?: (material: { id: string; type: 'exam' | 'lesson'; title: string }, startTime: Date, endTime: Date) => void
  currentDate?: Date
  onDateChange?: (date: Date) => void
}

// 15-minute slots for working hours (9:00–18:00) = 36 slots
const WORK_SLOT_COUNT = 36
const WORK_START_HOUR = 9
const SLOT_INTERVAL_MINUTES = 15

// Full day: 24 one-hour slots (for "24h" view)
const ALL_HOUR_SLOTS = Array.from({ length: 24 }, (_, i) => i)

function getWorkingSlotLabel(slotIndex: number): string {
  const totalMinutes = WORK_START_HOUR * 60 + slotIndex * SLOT_INTERVAL_MINUTES
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function getWorkingSlotStart(dayDate: Date, slotIndex: number): Date {
  const d = new Date(dayDate)
  d.setHours(0, 0, 0, 0)
  const totalMinutes = WORK_START_HOUR * 60 + slotIndex * SLOT_INTERVAL_MINUTES
  d.setMinutes(d.getMinutes() + totalMinutes)
  return d
}

export function SmartCalendar({
  events,
  labels: labelsProp,
  onEventClick,
  onSlotClick,
  onEventDrop,
  onMaterialDrop,
  currentDate = new Date(),
  onDateChange,
}: SmartCalendarProps) {
  const L = { ...DEFAULT_SMART_CALENDAR_LABELS, ...labelsProp }
  const DAYS = L.dayNames
  const [dragOverSlot, setDragOverSlot] = useState<{ day: number; slotIndex: number } | null>(null)
  const [showWorkingHoursOnly, setShowWorkingHoursOnly] = useState(true)

  const SLOTS = useMemo(
    () =>
      showWorkingHoursOnly
        ? Array.from({ length: WORK_SLOT_COUNT }, (_, i) => i)
        : ALL_HOUR_SLOTS,
    [showWorkingHoursOnly]
  )

  const getSlotStart = useCallback(
    (dayDate: Date, slotIndex: number) => {
      if (showWorkingHoursOnly) return getWorkingSlotStart(dayDate, slotIndex)
      const d = new Date(dayDate)
      d.setHours(slotIndex, 0, 0, 0)
      return d
    },
    [showWorkingHoursOnly]
  )

  const getSlotEnd = useCallback(
    (dayDate: Date, slotIndex: number) => {
      if (showWorkingHoursOnly) {
        const start = getWorkingSlotStart(dayDate, slotIndex)
        const end = new Date(start)
        end.setMinutes(end.getMinutes() + SLOT_INTERVAL_MINUTES)
        return end
      }
      const d = new Date(dayDate)
      d.setHours(slotIndex + 1, 0, 0, 0)
      return d
    },
    [showWorkingHoursOnly]
  )

  const getSlotLabel = useCallback(
    (slotIndex: number) => {
      if (showWorkingHoursOnly) return getWorkingSlotLabel(slotIndex)
      return `${slotIndex.toString().padStart(2, '0')}:00`
    },
    [showWorkingHoursOnly]
  )

  // Get week dates
  const weekDates = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      return date
    })
  }, [currentDate])

  // Get events for a specific day and slot (15-min or 1-hour depending on view)
  const getEventsForSlot = useCallback(
    (dayIndex: number, slotIndex: number) => {
      const dayDate = weekDates[dayIndex]
      const slotStart = getSlotStart(dayDate, slotIndex)
      const slotEnd = getSlotEnd(dayDate, slotIndex)

      return events.filter((event) => {
        const eventStart = new Date(event.startTime)
        const eventEnd = new Date(event.endTime)
        return eventStart < slotEnd && eventEnd > slotStart
      })
    },
    [events, weekDates, getSlotStart, getSlotEnd]
  )

  const handlePreviousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    onDateChange?.(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    onDateChange?.(newDate)
  }

  const handleToday = () => {
    onDateChange?.(new Date())
  }

  const handleSlotClick = (dayIndex: number, slotIndex: number) => {
    const dayDate = weekDates[dayIndex]
    const slotTime = getSlotStart(dayDate, slotIndex)
    onSlotClick?.(slotTime, slotIndex)
  }

  const handleDragOver = (e: React.DragEvent, dayIndex: number, slotIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSlot({ day: dayIndex, slotIndex })
  }

  const handleDrop = (e: React.DragEvent, dayIndex: number, slotIndex: number) => {
    e.preventDefault()
    setDragOverSlot(null)

    const jsonData = e.dataTransfer.getData('application/json')

    if (!jsonData || jsonData.trim() === '') {
      console.warn('No drag data available')
      return
    }

    try {
      const data = JSON.parse(jsonData)
      if (data.id && data.type) {
        const dayDate = weekDates[dayIndex]
        const startTime = getSlotStart(dayDate, slotIndex)
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + 60) // Default 1 hour duration

        if (data.isExistingEvent && data.eventId && onEventDrop) {
          onEventDrop(data.eventId, startTime, endTime)
        } else {
          const existingEvent = events.find((ev) => ev.materialId === data.id)
          if (existingEvent && onEventDrop) {
            onEventDrop(existingEvent.id, startTime, endTime)
          } else if (onMaterialDrop) {
            onMaterialDrop(
              { id: data.id, type: data.type, title: data.title },
              startTime,
              endTime
            )
          }
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error, 'Data:', jsonData)
    }
  }

  const getEventColor = (event: CalendarEvent) => {
    // Final exams use amber/orange to distinguish from regular exams (violet)
    if (event.type === 'exam' && event.isFinalExam) {
      return event.status === 'draft'
        ? 'bg-amber-400/80 border-amber-500 border-dashed'
        : 'bg-amber-600 border-amber-700'
    }
    // Color based on type, with status modifying opacity/style
    if (event.type === 'exam') {
      return event.status === 'draft' 
        ? 'bg-violet-400/80 border-violet-500 border-dashed' 
        : 'bg-violet-600 border-violet-700'
    }
    if (event.type === 'lesson') {
      return event.status === 'draft' 
        ? 'bg-emerald-400/80 border-emerald-500 border-dashed' 
        : 'bg-emerald-600 border-emerald-700'
    }
    return event.status === 'draft'
      ? 'bg-gray-400/80 border-gray-500 border-dashed'
      : 'bg-gray-600 border-gray-700'
  }

  const getEventTypeLabel = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'exam':
        return { icon: '📝', label: L.typeExam, bgClass: 'bg-violet-200 text-violet-800' }
      case 'lesson':
        return { icon: '📚', label: L.typeLesson, bgClass: 'bg-emerald-200 text-emerald-800' }
      case 'document':
        return { icon: '📄', label: L.typeDoc, bgClass: 'bg-gray-200 text-gray-800' }
      default:
        return { icon: '📌', label: L.typeItem, bgClass: 'bg-gray-200 text-gray-800' }
    }
  }

  // Count events this week
  const weekEventCount = useMemo(() => {
    return events.filter(e => {
      const eventStart = new Date(e.startTime)
      return eventStart >= weekDates[0] && eventStart <= weekDates[6]
    }).length
  }, [events, weekDates])

  const isCurrentWeek = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekStart = new Date(weekDates[0])
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekDates[6])
    weekEnd.setHours(23, 59, 59, 999)
    return today >= weekStart && today <= weekEnd
  }, [weekDates])

  const showSlotLabel = (slotIndex: number) => {
    if (!showWorkingHoursOnly) return true // 24h: show every hour
    return slotIndex % 4 === 0 // 15-min: show 09:00, 10:00, ...
  }
  const isHourStart = (slotIndex: number) => !showWorkingHoursOnly || slotIndex % 4 === 0

  return (
    <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Compact header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-full bg-gray-100/80 p-0.5">
            <button
              onClick={handlePreviousWeek}
              className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-800"
              title={L.previousWeek}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white rounded-full transition-all"
            >
              {L.today}
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-500 hover:text-gray-800"
              title={L.nextWeek}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="text-sm font-medium text-gray-700">
            {isCurrentWeek && <span>{L.today} · </span>}
            {weekDates[0].toLocaleDateString('en-US', { month: 'short' })} {weekDates[0].getDate()} – {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          {weekEventCount > 0 && (
            <span className="text-xs text-gray-500 font-medium">
              {weekEventCount} {weekEventCount === 1 ? L.eventSingular : L.eventsCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-violet-500" />{L.typeExam}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500" />{L.typeFinalExam}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500" />{L.typeLesson}</span>
          </div>
          <button
            onClick={() => setShowWorkingHoursOnly(!showWorkingHoursOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              showWorkingHoursOnly ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600'
            }`}
            title={showWorkingHoursOnly ? L.showAll24Hours : L.viewWorkingHours}
          >
            {showWorkingHoursOnly ? <Sun className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{showWorkingHoursOnly ? '9–18' : L.view24h}</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="min-w-full">
          {/* Day headers */}
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100">
            <div className="grid grid-cols-8 min-w-[640px]">
              <div className="w-14 flex-shrink-0 border-r border-gray-100" />
              {weekDates.map((date, index) => {
                const isToday = date.toDateString() === new Date().toDateString()
                const dayEvents = events.filter(e => new Date(e.startTime).toDateString() === date.toDateString())
                return (
                  <div
                    key={index}
                    className={`p-3 text-center border-r border-gray-100 last:border-r-0 ${
                      isToday ? 'bg-indigo-50/80' : 'bg-gray-50/50'
                    }`}
                  >
                    <div className={`text-[11px] font-medium uppercase tracking-wider ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                      {DAYS[index]}
                    </div>
                    <div className={`mt-1 text-lg font-semibold tabular-nums ${isToday ? 'text-indigo-600' : 'text-gray-800'}`}>
                      {date.getDate()}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="mt-1.5 h-1 flex justify-center gap-0.5">
                        {dayEvents.slice(0, 4).map((_, i) => (
                          <div key={i} className={`w-1 rounded-full ${isToday ? 'bg-indigo-400' : 'bg-gray-300'}`} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rows */}
          <div className="relative min-w-[640px]">
            {SLOTS.map((slotIndex) => {
              const hourStart = isHourStart(slotIndex)
              const slotMinHeight = showWorkingHoursOnly ? 'min-h-[40px]' : 'min-h-[56px]'
              return (
                <div
                  key={slotIndex}
                  className={`grid grid-cols-8 border-b border-gray-50 ${hourStart ? 'border-b-gray-100' : ''}`}
                >
                  <div className="sticky left-0 z-10 w-14 flex-shrink-0 py-1.5 pr-2 border-r border-gray-100 bg-white text-right">
                    {showSlotLabel(slotIndex) ? (
                      <span className={`text-xs tabular-nums ${hourStart ? 'font-medium text-gray-600' : 'text-gray-400'}`}>
                        {getSlotLabel(slotIndex)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 tabular-nums">{getSlotLabel(slotIndex)}</span>
                    )}
                  </div>

                  {weekDates.map((_, dayIndex) => {
                    const slotEvents = getEventsForSlot(dayIndex, slotIndex)
                    const isDragOver = dragOverSlot?.day === dayIndex && dragOverSlot?.slotIndex === slotIndex
                    return (
                      <div
                        key={`${dayIndex}-${slotIndex}`}
                        onDragOver={(e) => handleDragOver(e, dayIndex, slotIndex)}
                        onDrop={(e) => handleDrop(e, dayIndex, slotIndex)}
                        onClick={() => handleSlotClick(dayIndex, slotIndex)}
                        className={`
                          ${slotMinHeight} p-1 border-r border-gray-50 last:border-r-0
                          cursor-pointer transition-colors
                          hover:bg-gray-50/80
                          ${isDragOver ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-200' : ''}
                        `}
                      >
                        <div className="space-y-1 h-full">
                          {slotEvents.map((event) => {
                            const typeInfo = getEventTypeLabel(event.type)
                            return (
                              <div
                                key={event.id}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('application/json', JSON.stringify({
                                    id: event.materialId,
                                    type: event.type,
                                    title: event.title,
                                    isExistingEvent: true,
                                    eventId: event.id
                                  }))
                                  e.dataTransfer.effectAllowed = 'move'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEventClick?.(event)
                                }}
                                className={`
                                  group relative rounded-md px-2 py-1.5 text-xs cursor-move
                                  ${getEventColor(event)}
                                  text-white transition-all hover:shadow-md
                                  border-l-2
                                `}
                                style={{ minHeight: '36px' }}
                                title={`${event.title} · ${event.className} (${typeInfo.label})${event.status === 'draft' ? ` · ${L.unused}` : ''}`}
                              >
                                <p className="font-medium truncate leading-tight">{event.title}</p>
                                <p className="text-white/70 truncate text-[10px] leading-tight mt-0.5">{event.className}</p>
                                {event.status === 'draft' && (
                                  <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-300 rounded-full border border-white" title={L.unused} />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
