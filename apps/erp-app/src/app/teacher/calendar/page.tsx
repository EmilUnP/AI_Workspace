import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import type { CalendarEvent, DraftMaterial } from '@eduator/ui'
import { CalendarClient } from './calendar-client'

async function getTeacherId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) return null
  
  return { teacherId: profile.id, organizationId: profile.organization_id }
}

async function getClasses(teacherId: string, organizationId: string) {
  const supabase = createAdminClient()
  
  console.log(`[Calendar] Fetching classes for teacher ${teacherId} in org ${organizationId}`)
  
  // Get classes where teacher is primary (direct assignment)
  const { data: primaryClasses, error: primaryError } = await supabase
    .from('classes')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('teacher_id', teacherId)
    .eq('is_active', true)
  
  if (primaryError) {
    console.error('[Calendar] Error fetching primary classes:', primaryError)
  }
  console.log(`[Calendar] Primary classes (direct teacher_id):`, primaryClasses?.length || 0)
  
  // Get classes where teacher is assigned via class_teachers table
  const { data: classTeachers, error: ctError } = await supabase
    .from('class_teachers')
    .select('class_id')
    .eq('teacher_id', teacherId)
  
  if (ctError) {
    console.error('[Calendar] Error fetching class_teachers:', ctError)
  }
  console.log(`[Calendar] class_teachers assignments:`, classTeachers?.length || 0, classTeachers?.map(ct => ct.class_id))
  
  const assignedClassIds = classTeachers?.map(ct => ct.class_id) || []
  
  let additionalClasses: Array<{ id: string; name: string }> = []
  if (assignedClassIds.length > 0) {
    // Get all classes the teacher is assigned to (don't exclude by teacher_id - NULL comparison fails)
    const { data: additional, error: addError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('id', assignedClassIds)
    
    if (addError) {
      console.error('[Calendar] Error fetching additional classes:', addError)
    }
    console.log(`[Calendar] Additional classes from class_teachers:`, additional?.length || 0)
    
    additionalClasses = additional || []
  }
  
  // Merge and deduplicate
  const allClasses = [...(primaryClasses || []), ...additionalClasses]
  const uniqueClasses = Array.from(
    new Map(allClasses.map(c => [c.id, c])).values()
  )
  
  console.log(`[Calendar] Total unique classes:`, uniqueClasses.length, uniqueClasses.map(c => c.name))
  
  // Sort by name for consistent display
  return uniqueClasses
    .map(c => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function getDrafts(teacherId: string, organizationId: string): Promise<DraftMaterial[]> {
  const supabase = createAdminClient()
  
  console.log(`[Calendar] Fetching drafts for teacher ${teacherId} in org ${organizationId}`)
  
  // Get all exams created by teacher
  const { data: draftExams, error: examsError } = await supabase
    .from('exams')
    .select('id, title, description, questions, is_published, created_at, start_time, metadata')
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
  
  if (examsError) {
    console.error('[Calendar] Error fetching exams:', examsError)
  }
  console.log(`[Calendar] Exams found:`, draftExams?.length || 0)
  
  // Get all lessons created by teacher
  // Note: Lessons table doesn't have start_time/end_time columns (only exams do)
  const { data: draftLessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, title, description, topic, duration_minutes, is_published, created_at, class_id, metadata')
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
  
  if (lessonsError) {
    console.error('[Calendar] Error fetching lessons:', lessonsError)
  }
  console.log(`[Calendar] Lessons found:`, draftLessons?.length || 0, draftLessons?.map(l => l.title))
  
  const unscheduledExams = draftExams || []
  const unscheduledLessons = draftLessons || []

  const exams: DraftMaterial[] = (unscheduledExams || []).map(exam => ({
    id: exam.id,
    type: 'exam' as const,
    title: exam.title,
    description: exam.description,
    is_published: exam.is_published,
    created_at: exam.created_at,
    questions: exam.questions,
  }))

  const lessons: DraftMaterial[] = (unscheduledLessons || []).map(lesson => ({
    id: lesson.id,
    type: 'lesson' as const,
    title: lesson.title,
    description: lesson.description,
    topic: lesson.topic,
    duration_minutes: lesson.duration_minutes,
    is_published: lesson.is_published,
    created_at: lesson.created_at,
  }))
  
  console.log(`[Calendar] Total drafts: ${exams.length} exams + ${lessons.length} lessons = ${exams.length + lessons.length}`)
  
  return [...exams, ...lessons]
}

async function getScheduledEvents(teacherId: string, organizationId: string): Promise<CalendarEvent[]> {
  const supabase = createAdminClient()
  
  // Get scheduled exams (only in-app; course-generated are not in calendar)
  const { data: scheduledExams } = await supabase
    .from('exams')
    .select('id, title, class_id, start_time, end_time, is_published, created_at, metadata')
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .not('start_time', 'is', null)
    .not('end_time', 'is', null)
  
  // Get scheduled lessons (only in-app)
  const { data: scheduledLessons } = await supabase
    .from('lessons')
    .select('id, title, class_id, start_time, end_time, is_published, created_at, metadata')
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .not('start_time', 'is', null)
    .not('end_time', 'is', null)

  // Get final exams created by teacher (they have start_time/end_time and appear on calendar)
  const { data: finalExams } = await supabase
    .from('final_exams')
    .select('id, title, class_id, start_time, end_time, created_at')
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)
  
  // Get class names
  const allClassIds = [
    ...(scheduledExams?.map(e => e.class_id).filter(Boolean) || []),
    ...(scheduledLessons?.map(l => l.class_id).filter(Boolean) || []),
    ...(finalExams?.map(f => f.class_id).filter(Boolean) || [])
  ]
  const uniqueClassIds = Array.from(new Set(allClassIds))
  
  let classMap: Record<string, string> = {}
  if (uniqueClassIds.length > 0) {
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name')
      .in('id', uniqueClassIds)
    
    classMap = (classes || []).reduce((acc, cls) => {
      acc[cls.id] = cls.name
      return acc
    }, {} as Record<string, string>)
  }

  // Get student counts for live status
  const studentCounts: Record<string, { total: number; active: number }> = {}
  
  // For now, we'll use enrollment counts as a proxy for active students
  // In a real implementation, you'd track active sessions
  if (uniqueClassIds.length > 0) {
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .in('class_id', uniqueClassIds)
      .eq('status', 'active')
    
    const enrollmentCounts = (enrollments || []).reduce((acc, e) => {
      acc[e.class_id] = (acc[e.class_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // For each scheduled event, get the class enrollment count
    scheduledExams?.forEach(exam => {
      if (exam.class_id) {
        const total = enrollmentCounts[exam.class_id] || 0
        studentCounts[exam.id] = {
          total,
          active: Math.floor(total * 0.7) // Simulated active count
        }
      }
    })
    
    scheduledLessons?.forEach(lesson => {
      if (lesson.class_id) {
        const total = enrollmentCounts[lesson.class_id] || 0
        studentCounts[lesson.id] = {
          total,
          active: Math.floor(total * 0.8) // Simulated active count
        }
      }
    })
    finalExams?.forEach(fe => {
      if (fe.class_id) {
        const total = enrollmentCounts[fe.class_id] || 0
        studentCounts[fe.id] = {
          total,
          active: Math.floor(total * 0.7)
        }
      }
    })
  }
  
  const examEvents: CalendarEvent[] = (scheduledExams || []).map(exam => ({
    id: exam.id,
    type: 'exam' as const,
    title: exam.title,
    classId: exam.class_id || '',
    className: classMap[exam.class_id || ''] || 'Unknown Class',
    startTime: new Date(exam.start_time),
    endTime: new Date(exam.end_time),
    status: exam.is_published ? 'published' as const : 'draft' as const,
    materialId: exam.id,
    studentCount: studentCounts[exam.id]?.total,
    activeStudents: studentCounts[exam.id]?.active,
  }))

  const lessonEvents: CalendarEvent[] = (scheduledLessons || []).map(lesson => ({
    id: lesson.id,
    type: 'lesson' as const,
    title: lesson.title,
    classId: lesson.class_id || '',
    className: classMap[lesson.class_id || ''] || 'Unknown Class',
    startTime: new Date(lesson.start_time),
    endTime: new Date(lesson.end_time),
    status: lesson.is_published ? 'published' as const : 'draft' as const,
    materialId: lesson.id,
    studentCount: studentCounts[lesson.id]?.total,
    activeStudents: studentCounts[lesson.id]?.active,
  }))

  const finalExamEvents: CalendarEvent[] = (finalExams || []).map(fe => ({
    id: fe.id,
    type: 'exam' as const,
    title: fe.title || 'Final exam',
    classId: fe.class_id || '',
    className: classMap[fe.class_id || ''] || 'Unknown Class',
    startTime: new Date(fe.start_time),
    endTime: new Date(fe.end_time),
    status: 'published' as const,
    materialId: fe.id,
    studentCount: studentCounts[fe.id]?.total,
    activeStudents: studentCounts[fe.id]?.active,
    isFinalExam: true,
  }))
  
  return [...examEvents, ...lessonEvents, ...finalExamEvents]
}

export default async function TeacherCalendarPage() {
  const teacherData = await getTeacherId()
  
  if (!teacherData) {
    redirect('/auth/login')
  }
  
  const t = await getTranslations('teacherCalendar')
  const { teacherId, organizationId } = teacherData
  
  const [classes, drafts, eventsRaw] = await Promise.all([
    getClasses(teacherId, organizationId),
    getDrafts(teacherId, organizationId),
    getScheduledEvents(teacherId, organizationId)
  ])
  const unknownClassLabel = t('unknownClass')
  const events = eventsRaw.map((e) => ({
    ...e,
    className: e.className === 'Unknown Class' ? unknownClassLabel : e.className,
  }))
  
  const calendarLabels = {
    title: t('title'),
    scheduledDrafts: t('scheduledDrafts', { scheduled: '{scheduled}', drafts: '{drafts}' }),
    allClasses: t('allClasses'),
    showAllClasses: t('showAllClasses'),
    eventsCount: t('eventsCount'),
    eventSingular: t('eventSingular'),
    unknownClass: t('unknownClass'),
    yourClasses: t('yourClasses'),
    noClassesMatch: t('noClassesMatch'),
    noClassesAvailable: t('noClassesAvailable'),
    searchClassesPlaceholder: t('searchClassesPlaceholder', { count: '{count}' }),
    exams: t('exams'),
    lessons: t('lessons'),
    classes: t('classes'),
    aiActive: t('aiActive'),
    dragging: t('dragging'),
    classFallback: t('classFallback'),
    scheduleMaterial: t('scheduleMaterial'),
    selectClass: t('selectClass'),
    startTime: t('startTime'),
    endTime: t('endTime'),
    cancel: t('cancel'),
    scheduling: t('scheduling'),
    schedule: t('schedule'),
    tipClassFilter: t('tipClassFilter', { className: '{className}' }),
    materialsLibrary: t('materialsLibrary'),
    itemsTotal: t('itemsTotal'),
    target: t('target'),
    all: t('all'),
    searchMaterials: t('searchMaterials'),
    noMaterialsFound: t('noMaterialsFound'),
    tryDifferentSearch: t('tryDifferentSearch'),
    createExamsOrLessons: t('createExamsOrLessons'),
    showingXOfY: t('showingXOfY', { showing: '{showing}', total: '{total}' }),
    dragToCalendar: t('dragToCalendar'),
    loadMore: t('loadMore'),
    remaining: t('remaining'),
    dragHint: t('dragHint'),
    live: t('live'),
    unused: t('unused'),
    editEvent: t('editEvent'),
    updateScheduleDetails: t('updateScheduleDetails'),
    published: t('published'),
    scheduled: t('scheduled'),
    titleLabel: t('titleLabel'),
    classLabel: t('classLabel'),
    startTimeLabel: t('startTimeLabel'),
    endTimeLabel: t('endTimeLabel'),
    confirmPublish: t('confirmPublish'),
    confirming: t('confirming'),
    confirmPublishWeek: t('confirmPublishWeek'),
    confirmingWeek: t('confirmingWeek'),
    saveChanges: t('saveChanges'),
    saving: t('saving'),
    unpublish: t('unpublish'),
    reverting: t('reverting'),
    deleteEvent: t('deleteEvent'),
    deleteConfirm: t('deleteConfirm'),
    dayMon: t('dayMon'),
    dayTue: t('dayTue'),
    dayWed: t('dayWed'),
    dayThu: t('dayThu'),
    dayFri: t('dayFri'),
    daySat: t('daySat'),
    daySun: t('daySun'),
    previousWeek: t('previousWeek'),
    nextWeek: t('nextWeek'),
    today: t('today'),
    view24h: t('view24h'),
    viewWorkingHours: t('viewWorkingHours'),
    showAll24Hours: t('showAll24Hours'),
    typeExam: t('typeExam'),
    typeLesson: t('typeLesson'),
    typeFinalExam: t('typeFinalExam'),
    typeDoc: t('typeDoc'),
    typeItem: t('typeItem'),
  }
  
  return (
    <div className="-m-4 sm:-m-6 h-[calc(100vh-4rem)]">
      <CalendarClient
        events={events}
        drafts={drafts}
        classes={classes}
        labels={calendarLabels}
      />
    </div>
  )
}
