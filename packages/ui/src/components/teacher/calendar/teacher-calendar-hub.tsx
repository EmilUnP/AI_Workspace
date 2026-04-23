'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { SmartCalendar, type CalendarEvent } from './smart-calendar'
import { DraftsSidebar, type DraftMaterial } from './drafts-sidebar'
import { QuickEditPanel } from './quick-edit-panel'
import { Sparkles, Menu, X, CheckCircle, Loader2, Search, ChevronDown, Filter, Calendar as CalendarIcon } from 'lucide-react'

function toLocalDatetimeString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export interface TeacherCalendarHubLabels {
  title: string
  scheduledDrafts: string
  allClasses: string
  showAllClasses: string
  eventsCount: string
  eventSingular: string
  unknownClass: string
  yourClasses: string
  noClassesMatch: string
  noClassesAvailable: string
  searchClassesPlaceholder: string
  exams: string
  lessons: string
  classes: string
  aiActive: string
  dragging: string
  classFallback: string
  scheduleMaterial: string
  selectClass: string
  startTime: string
  endTime: string
  cancel: string
  scheduling: string
  schedule: string
  tipClassFilter: string
  materialsLibrary: string
  itemsTotal: string
  target: string
  all: string
  searchMaterials: string
  noMaterialsFound: string
  tryDifferentSearch: string
  createExamsOrLessons: string
  showingXOfY: string
  dragToCalendar: string
  loadMore: string
  remaining: string
  dragHint: string
  live: string
  unused: string
  editEvent: string
  updateScheduleDetails: string
  published: string
  scheduled: string
  titleLabel: string
  classLabel: string
  startTimeLabel: string
  endTimeLabel: string
  confirmPublish: string
  confirming: string
  confirmPublishWeek: string
  confirmingWeek: string
  saveChanges: string
  saving: string
  unpublish: string
  reverting: string
  deleteEvent: string
  deleteConfirm: string
  dayMon: string
  dayTue: string
  dayWed: string
  dayThu: string
  dayFri: string
  daySat: string
  daySun: string
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
}

const DEFAULT_CALENDAR_LABELS: TeacherCalendarHubLabels = {
  title: 'Calendar Hub',
  scheduledDrafts: '{scheduled} scheduled • {drafts} drafts',
  allClasses: 'All Classes',
  showAllClasses: 'Show events from all classes',
  eventsCount: 'events',
  eventSingular: 'event',
  unknownClass: 'Unknown',
  yourClasses: 'Your Classes',
  noClassesMatch: 'No classes match your search',
  noClassesAvailable: 'No classes available',
  searchClassesPlaceholder: 'Search {count} classes...',
  exams: 'Exams',
  lessons: 'Lessons',
  classes: 'Classes',
  aiActive: 'AI Active',
  dragging: 'Dragging:',
  classFallback: 'Class',
  scheduleMaterial: 'Schedule Material',
  selectClass: 'Select Class',
  startTime: 'Start time',
  endTime: 'End time',
  cancel: 'Cancel',
  scheduling: 'Scheduling...',
  schedule: 'Schedule',
  tipClassFilter: 'Tip: Class filter is active. New items will default to {className}',
  materialsLibrary: 'Materials Library',
  itemsTotal: 'items total',
  target: 'Target:',
  all: 'All',
  searchMaterials: 'Search materials...',
  noMaterialsFound: 'No materials found',
  tryDifferentSearch: 'Try a different search term',
  createExamsOrLessons: 'Create exams or lessons to see them here',
  showingXOfY: 'Showing {showing} of {total}',
  dragToCalendar: 'Drag to calendar',
  loadMore: 'Load more',
  remaining: 'remaining',
  dragHint: 'Drag any item to a calendar slot to schedule',
  live: '✓ Live',
  unused: '○ Unused',
  editEvent: 'Edit Event',
  updateScheduleDetails: 'Update schedule details',
  published: 'Published',
  scheduled: 'Scheduled',
  titleLabel: 'Title',
  classLabel: 'Class',
  startTimeLabel: 'Start Time',
  endTimeLabel: 'End Time',
  confirmPublish: 'Confirm & publish',
  confirming: 'Confirming...',
  confirmPublishWeek: 'Confirm & publish week',
  confirmingWeek: 'Confirming...',
  saveChanges: 'Save Changes',
  saving: 'Saving...',
  unpublish: 'Unpublish (revert to draft)',
  reverting: 'Reverting...',
  deleteEvent: 'Delete Event',
  deleteConfirm: 'Are you sure you want to delete this scheduled event?',
  dayMon: 'Mon',
  dayTue: 'Tue',
  dayWed: 'Wed',
  dayThu: 'Thu',
  dayFri: 'Fri',
  daySat: 'Sat',
  daySun: 'Sun',
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
}

export interface TeacherCalendarHubProps {
  events: CalendarEvent[]
  drafts: DraftMaterial[]
  classes: Array<{ id: string; name: string }>
  labels?: Partial<TeacherCalendarHubLabels>
  onScheduleMaterial?: (materialId: string, type: 'exam' | 'lesson', startTime: Date, endTime: Date, classIds: string[]) => Promise<void>
  onUpdateEvent?: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>
  onDeleteEvent?: (eventId: string) => Promise<void>
  onUnpublishEvent?: (eventId: string) => Promise<void>
  onConfirmWeek?: (eventIds: string[]) => Promise<void>
  onSlotClick?: (date: Date, hour: number) => void
  currentDate?: Date
  onDateChange?: (date: Date) => void
}

export function TeacherCalendarHub({
  events,
  drafts,
  classes,
  labels: labelsProp,
  onScheduleMaterial,
  onUpdateEvent,
  onDeleteEvent,
  onUnpublishEvent,
  onConfirmWeek,
  onSlotClick,
  currentDate,
  onDateChange
}: TeacherCalendarHubProps) {
  const L = { ...DEFAULT_CALENDAR_LABELS, ...labelsProp }
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isConfirmingWeek, setIsConfirmingWeek] = useState(false)
  const [isDraftsOpen, setIsDraftsOpen] = useState(true)
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false)
  const [pendingSchedule, setPendingSchedule] = useState<{
    material: DraftMaterial
    startTime: Date
    endTime: Date
  } | null>(null)
  const [pendingStartTime, setPendingStartTime] = useState<string>('')
  const [pendingEndTime, setPendingEndTime] = useState<string>('')
  const [isScheduling, setIsScheduling] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<string>('all')
  const [draggedMaterial, setDraggedMaterial] = useState<DraftMaterial | null>(null)
  const [classSearchQuery, setClassSearchQuery] = useState('')
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false)
  const classDropdownRef = useRef<HTMLDivElement>(null)

  // Debug logging when data changes
  useEffect(() => {
    const exams = drafts.filter(d => d.type === 'exam')
    const lessons = drafts.filter(d => d.type === 'lesson')
    
    console.log('=== [TeacherCalendarHub] Data Debug ===')
    console.log('Classes:', classes.length, classes)
    console.log('Drafts:', drafts.length, 'Exams:', exams.length, 'Lessons:', lessons.length)
    console.log('Events:', events.length)
    console.log('Classes list:', classes.map(c => `${c.id}: ${c.name}`).join(', ') || 'NONE')
    console.log('=====================================')
  }, [events, drafts, classes])

  // Sync editable start/end times when pending schedule is set (local time for datetime-local)
  useEffect(() => {
    if (pendingSchedule) {
      setPendingStartTime(toLocalDatetimeString(pendingSchedule.startTime))
      setPendingEndTime(toLocalDatetimeString(pendingSchedule.endTime))
    }
  }, [pendingSchedule])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
        setIsClassDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter classes based on search
  const filteredClasses = useMemo(() => {
    if (!classSearchQuery.trim()) return classes
    const query = classSearchQuery.toLowerCase()
    return classes.filter(c => c.name.toLowerCase().includes(query))
  }, [classes, classSearchQuery])

  const selectedClassName = useMemo(() => {
    if (selectedClassId === 'all') return L.allClasses
    return classes.find(c => c.id === selectedClassId)?.name || L.unknownClass
  }, [selectedClassId, classes, L])

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsEditPanelOpen(true)
  }, [])

  const handleSlotClick = useCallback((date: Date, hour: number) => {
    // Check if there's a pending material drop
    if (pendingSchedule) {
      // Material was dropped, show class selection
      return
    }
    onSlotClick?.(date, hour)
  }, [onSlotClick, pendingSchedule])

  const handleMaterialDrop = useCallback((materialData: { id: string; type: 'exam' | 'lesson'; title: string }, startTime: Date, endTime: Date) => {
    const material = drafts.find(d => d.id === materialData.id && d.type === materialData.type)
    if (material) {
      setPendingSchedule({ material, startTime, endTime })
      setDraggedMaterial(null)
    }
  }, [drafts])
  
  const handleMaterialDragStart = useCallback((material: DraftMaterial) => {
    setDraggedMaterial(material)
  }, [])
  
  const handleMaterialDragEnd = useCallback(() => {
    setDraggedMaterial(null)
  }, [])
  
  // Filter events by selected class
  const filteredEvents = selectedClassId === 'all' 
    ? events 
    : events.filter(e => e.classId === selectedClassId)
  
  // Get default class for scheduling (use selected class if one is selected)
  const defaultClassId = selectedClassId !== 'all' ? selectedClassId : classes[0]?.id || ''

  const handleScheduleConfirm = useCallback(
    async (classIds: string[]) => {
      if (!pendingSchedule || !onScheduleMaterial) return
      const start = new Date(pendingStartTime)
      const end = new Date(pendingEndTime)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return

      setIsScheduling(true)
      try {
        await onScheduleMaterial(
          pendingSchedule.material.id,
          pendingSchedule.material.type,
          start,
          end,
          classIds
        )
        setPendingSchedule(null)
      } catch (error) {
        console.error('Error scheduling material:', error)
      } finally {
        setIsScheduling(false)
      }
    },
    [pendingSchedule, pendingStartTime, pendingEndTime, onScheduleMaterial]
  )
  
  const handleEventDrop = useCallback(async (eventId: string, newStartTime: Date, newEndTime: Date) => {
    const event = events.find(e => e.id === eventId)
    if (event && onUpdateEvent) {
      await onUpdateEvent(eventId, {
        startTime: newStartTime,
        endTime: newEndTime
      })
    }
  }, [events, onUpdateEvent])


  const handleSaveEvent = useCallback(async (event: CalendarEvent, updates: Partial<CalendarEvent>) => {
    if (onUpdateEvent) {
      await onUpdateEvent(event.id, updates)
      setIsEditPanelOpen(false)
      setSelectedEvent(null)
    }
  }, [onUpdateEvent])

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (onDeleteEvent) {
      await onDeleteEvent(eventId)
      setIsEditPanelOpen(false)
      setSelectedEvent(null)
    }
  }, [onDeleteEvent])

  const handleConfirmWeekLocal = useCallback(
    async (eventIds: string[]) => {
      if (!onConfirmWeek || eventIds.length === 0) return
      setIsConfirmingWeek(true)
      try {
        await onConfirmWeek(eventIds)
      } finally {
        setIsConfirmingWeek(false)
      }
    },
    [onConfirmWeek]
  )

  const viewDate = currentDate ?? new Date()
  const draftEventIdsInWeek = useMemo(() => {
    const startOfWeek = new Date(viewDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)
    const weekEnd = new Date(startOfWeek)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    return events
      .filter((e) => {
        if (e.status !== 'draft') return false
        const start = new Date(e.startTime)
        return start >= startOfWeek && start <= weekEnd
      })
      .map((e) => e.id)
  }, [events, viewDate])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar with AI Pulse and Class Filter */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDraftsOpen(!isDraftsOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          >
            {isDraftsOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{L.title}</h1>
              <p className="hidden sm:block text-xs text-gray-500">
                {L.scheduledDrafts.replace('{scheduled}', String(events.length)).replace('{drafts}', String(drafts.length))}
              </p>
            </div>
          </div>
          
          {/* Searchable Class Filter Dropdown */}
          <div className="relative ml-2 lg:ml-4" ref={classDropdownRef}>
            <button
              onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all min-w-[160px] lg:min-w-[200px] ${
                selectedClassId !== 'all'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              <Filter className="h-4 w-4 flex-shrink-0" />
              <span className="truncate flex-1 text-left font-medium">
                {selectedClassName}
              </span>
              <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown Panel */}
            {isClassDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                {/* Search Input */}
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder={L.searchClassesPlaceholder.replace('{count}', String(classes.length))}
                      value={classSearchQuery}
                      onChange={(e) => setClassSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                      autoFocus
                    />
                  </div>
                </div>
                
                {/* Options List */}
                <div className="max-h-64 overflow-y-auto">
                  {/* All Classes Option */}
                  <button
                    onClick={() => {
                      setSelectedClassId('all')
                      setIsClassDropdownOpen(false)
                      setClassSearchQuery('')
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                      selectedClassId === 'all' ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      selectedClassId === 'all' ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${selectedClassId === 'all' ? 'text-indigo-700' : 'text-gray-700'}`}>
                        {L.allClasses}
                      </p>
                      <p className="text-xs text-gray-500">{L.showAllClasses}</p>
                    </div>
                    <span className="text-xs text-gray-400">{events.length} {events.length === 1 ? L.eventSingular : L.eventsCount}</span>
                  </button>
                  
                  {/* Divider */}
                  {filteredClasses.length > 0 && (
                    <div className="px-3 py-1.5 bg-gray-50 border-y border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {L.yourClasses} ({filteredClasses.length})
                      </p>
                    </div>
                  )}
                  
                  {/* Class Options */}
                  {filteredClasses.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-sm text-gray-500">
                        {classSearchQuery ? L.noClassesMatch : L.noClassesAvailable}
                      </p>
                    </div>
                  ) : (
                    filteredClasses.map((cls) => {
                      const classEventCount = events.filter(e => e.classId === cls.id).length
                      return (
                        <button
                          key={cls.id}
                          onClick={() => {
                            setSelectedClassId(cls.id)
                            setIsClassDropdownOpen(false)
                            setClassSearchQuery('')
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                            selectedClassId === cls.id ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full border-2 ${
                            selectedClassId === cls.id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              selectedClassId === cls.id ? 'text-indigo-700' : 'text-gray-700'
                            }`}>
                              {cls.name}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {classEventCount} {classEventCount === 1 ? L.eventSingular : L.eventsCount}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Side - Confirm week, Stats and AI Pulse */}
        <div className="flex items-center gap-3">
          {draftEventIdsInWeek.length > 0 && onConfirmWeek && (
            <button
              onClick={() => handleConfirmWeekLocal(draftEventIdsInWeek)}
              disabled={isConfirmingWeek}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:pointer-events-none"
              title={L.confirmPublishWeek}
            >
              {isConfirmingWeek ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isConfirmingWeek ? L.confirmingWeek : L.confirmPublishWeek}
              </span>
              <span className="sm:hidden">({draftEventIdsInWeek.length})</span>
            </button>
          )}
          {/* AI Pulse Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
            <div className="relative">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="h-4 w-4 text-indigo-400 opacity-75" />
              </div>
            </div>
            <span className="text-sm font-medium text-indigo-900 hidden sm:inline">{L.aiActive}</span>
          </div>
        </div>
      </div>
      
      {/* Dragging Indicator */}
      {draggedMaterial && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg flex items-center gap-2 pointer-events-none">
          <span className="text-sm font-medium">{L.dragging} {draggedMaterial.title}</span>
          {selectedClassId !== 'all' && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
              → {classes.find(c => c.id === selectedClassId)?.name || L.classFallback}
            </span>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Drafts Sidebar */}
        <div className={`${isDraftsOpen ? 'block' : 'hidden'} lg:block`}>
          <DraftsSidebar
            drafts={drafts}
            onDragStart={handleMaterialDragStart}
            onDragEnd={handleMaterialDragEnd}
            onClose={() => setIsDraftsOpen(false)}
            isOpen={isDraftsOpen}
            selectedClassId={selectedClassId !== 'all' ? selectedClassId : undefined}
            selectedClassName={selectedClassId !== 'all' ? classes.find(c => c.id === selectedClassId)?.name : undefined}
            labels={L}
          />
        </div>

        {/* Calendar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <SmartCalendar
            events={filteredEvents}
            classes={classes}
            labels={{
              dayNames: [L.dayMon, L.dayTue, L.dayWed, L.dayThu, L.dayFri, L.daySat, L.daySun],
              previousWeek: L.previousWeek,
              nextWeek: L.nextWeek,
              today: L.today,
              view24h: L.view24h,
              viewWorkingHours: L.viewWorkingHours,
              showAll24Hours: L.showAll24Hours,
              typeExam: L.typeExam,
              typeLesson: L.typeLesson,
              typeFinalExam: L.typeFinalExam,
              typeDoc: L.typeDoc,
              typeItem: L.typeItem,
              eventSingular: L.eventSingular,
              eventsCount: L.eventsCount,
              unused: L.unused,
            }}
            onEventClick={handleEventClick}
            onSlotClick={handleSlotClick}
            onEventDrop={handleEventDrop}
            onMaterialDrop={handleMaterialDrop}
            currentDate={currentDate}
            onDateChange={onDateChange}
          />
        </div>

        {/* Quick Edit Panel */}
        {isEditPanelOpen && selectedEvent && (
          <QuickEditPanel
            event={selectedEvent}
            classes={classes}
            labels={L}
            onClose={() => {
              setIsEditPanelOpen(false)
              setSelectedEvent(null)
            }}
            onSave={handleSaveEvent}
            onUnpublish={onUnpublishEvent}
            onDelete={handleDeleteEvent}
          />
        )}
      </div>

      {/* Class Selection Dialog for Material Drop */}
      {pendingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => !isScheduling && setPendingSchedule(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{L.scheduleMaterial}</h3>
                <p className="text-sm text-gray-500">{pendingSchedule.material.title}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {L.selectClass}
              </label>
              <select
                id="class-select"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                disabled={isScheduling}
                defaultValue={defaultClassId}
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
              {selectedClassId !== 'all' && (
                <p className="mt-1 text-xs text-gray-500">
                  💡 {L.tipClassFilter.replace('{className}', classes.find(c => c.id === selectedClassId)?.name ?? '')}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {L.startTime}
              </label>
              <input
                type="datetime-local"
                step={900}
                value={pendingStartTime}
                onChange={(e) => setPendingStartTime(e.target.value)}
                disabled={isScheduling}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {L.endTime}
              </label>
              <input
                type="datetime-local"
                step={900}
                value={pendingEndTime}
                onChange={(e) => setPendingEndTime(e.target.value)}
                disabled={isScheduling}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingSchedule(null)}
                disabled={isScheduling}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {L.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  const select = document.getElementById('class-select') as HTMLSelectElement
                  if (select) {
                    handleScheduleConfirm([select.value])
                  }
                }}
                disabled={isScheduling}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isScheduling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {L.scheduling}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {L.schedule}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
