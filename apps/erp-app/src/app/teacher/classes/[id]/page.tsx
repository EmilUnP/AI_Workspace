import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import Link from 'next/link'
import { 
  BookOpen, 
  Users, 
  ArrowLeft, 
  Calendar,
  GraduationCap,
  Copy,
  CheckCircle,
  FileText,
  FolderOpen,
  Sparkles,
  PlayCircle,
  Share2
} from 'lucide-react'
import { ShareExamDialog, ShareDocumentDialog, ShareLessonDialog, SharedContentList, ClassAITutor, Avatar } from '@eduator/ui'
import { shareExamsWithClass, shareDocumentsWithClass, shareLessonsWithClass, removeExamFromClass, removeDocumentFromClass, removeLessonFromClass } from './actions'
import { EnrollStudentClient } from './enroll-student-client'
import { createConversation, updateConversation, getConversations } from '../../chat/actions'

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

async function getClassDetails(classId: string, organizationId: string, teacherId: string) {
  const supabase = createAdminClient()
  
  // Get class data
  const { data: classData, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .eq('organization_id', organizationId)
    .single()
  
  if (error || !classData) {
    console.error('Error fetching class:', error)
    return null
  }
  
  // Verify teacher has access (either primary or assigned)
  const isPrimaryTeacher = classData.teacher_id === teacherId
  
  if (!isPrimaryTeacher) {
    const { data: assignment } = await supabase
      .from('class_teachers')
      .select('id')
      .eq('class_id', classId)
      .eq('teacher_id', teacherId)
      .single()
    
    if (!assignment) {
      return null // Teacher doesn't have access
    }
  }
  
  return classData
}

async function getEnrolledStudents(classId: string) {
  const supabase = createAdminClient()
  
  const { data: enrollments, error } = await supabase
    .from('class_enrollments')
    .select('id, enrolled_at, status, student_id')
    .eq('class_id', classId)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })
  
  if (error || !enrollments || enrollments.length === 0) {
    return []
  }
  
  const studentIds = enrollments.map(e => e.student_id)
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', studentIds)
  
  type StudentProfile = { id: string; full_name: string | null; email: string; avatar_url?: string | null }
  const studentsMap: Record<string, StudentProfile> = {}
  students?.forEach(s => {
    studentsMap[s.id] = s
  })
  
  return enrollments.map(e => ({
    ...e,
    student: studentsMap[e.student_id] || null
  }))
}

async function getClassStats(classId: string, teacherId: string) {
  const supabase = createAdminClient()
  
  // Get exam count for this class (excluding archived and course-generated)
  const { count: examCount } = await supabase
    .from('exams')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
  
  // Get document count for this class (excluding archived)
  const { count: documentCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
  
  // Get lesson count (if lessons table exists, excluding archived and course-generated)
  let lessonCount = 0
  try {
    const { count } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('created_by', teacherId)
      .eq('is_archived', false)
      .or('course_generated.eq.0,course_generated.is.null')
    lessonCount = count || 0
  } catch {
    // Lessons table might not exist yet
  }
  
  return {
    exams: examCount || 0,
    documents: documentCount || 0,
    lessons: lessonCount
  }
}

async function getSharedExams(classId: string, teacherId: string) {
  const supabase = createAdminClient()
  
  const { data: exams } = await supabase
    .from('exams')
    .select('id, title, description, questions, is_published, created_at, language, translations')
    .eq('class_id', classId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
  
  return exams || []
}

async function getSharedDocuments(classId: string, teacherId: string) {
  const supabase = createAdminClient()
  
  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, description, file_type, file_size, file_url, created_at')
    .eq('class_id', classId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
  
  return documents || []
}

async function getSharedLessons(classId: string, teacherId: string) {
  const supabase = createAdminClient()
  
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, description, topic, duration_minutes, is_published, created_at')
    .eq('class_id', classId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
  
  return lessons || []
}

async function getClassConversation(classId: string, teacherId: string) {
  const supabase = createAdminClient()
  
  const { data: conversation } = await supabase
    .from('teacher_chat_conversations')
    .select('id, title, document_ids, context, is_active, created_at, updated_at, class_id')
    .eq('class_id', classId)
    .eq('teacher_id', teacherId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  return conversation || null
}

async function getAvailableExams(teacherId: string, organizationId: string, classId: string) {
  const supabase = createAdminClient()
  
  // Get exams already shared with this class
  const { data: sharedExams } = await supabase
    .from('exams')
    .select('id')
    .eq('class_id', classId)
    .eq('created_by', teacherId)
  
  const sharedIds = sharedExams?.map(e => e.id) || []
  
  // Get all in-app exams (exclude course-generated) created by teacher that are not shared with this class
  let query = supabase
    .from('exams')
    .select('id, title, description, questions, is_published, created_at, language, translations')
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
  
  if (sharedIds.length > 0) {
    query = query.not('id', 'in', `(${sharedIds.join(',')})`)
  }
  
  const { data } = await query
  return data || []
}

async function getAvailableDocuments(teacherId: string, organizationId: string, classId: string) {
  const supabase = createAdminClient()
  
  // Get documents already shared with this class
  const { data: sharedDocuments } = await supabase
    .from('documents')
    .select('id')
    .eq('class_id', classId)
    .eq('created_by', teacherId)
  
  const sharedIds = sharedDocuments?.map(d => d.id) || []
  
  // Get all documents created by teacher that are not shared with this class
  let query = supabase
    .from('documents')
    .select('id, title, description, file_type, file_size, file_url, created_at')
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
  
  if (sharedIds.length > 0) {
    query = query.not('id', 'in', `(${sharedIds.join(',')})`)
  }
  
  const { data } = await query
  return data || []
}

async function getAvailableLessons(teacherId: string, organizationId: string, classId: string) {
  const supabase = createAdminClient()
  
  // Get lessons already shared with this class
  const { data: sharedLessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('class_id', classId)
    .eq('created_by', teacherId)
  
  const sharedIds = sharedLessons?.map(l => l.id) || []
  
  // Get all in-app lessons (exclude course-generated) created by teacher that are not shared with this class
  let query = supabase
    .from('lessons')
    .select('id, title, description, topic, duration_minutes, is_published, created_at')
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
  
  if (sharedIds.length > 0) {
    query = query.not('id', 'in', `(${sharedIds.join(',')})`)
  }
  
  const { data } = await query
  return data || []
}

export default async function TeacherClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: classId } = await params
  const teacherData = await getTeacherId()
  
  if (!teacherData) {
    redirect('/auth/login')
  }
  
  const { teacherId, organizationId } = teacherData
  
  const [classData, enrolledStudents, stats, sharedExams, sharedDocuments, sharedLessons, availableExams, availableDocuments, availableLessons, classConversation] = await Promise.all([
    getClassDetails(classId, organizationId, teacherId),
    getEnrolledStudents(classId),
    getClassStats(classId, teacherId),
    getSharedExams(classId, teacherId),
    getSharedDocuments(classId, teacherId),
    getSharedLessons(classId, teacherId),
    getAvailableExams(teacherId, organizationId, classId),
    getAvailableDocuments(teacherId, organizationId, classId),
    getAvailableLessons(teacherId, organizationId, classId),
    getClassConversation(classId, teacherId),
  ])
  
  if (!classData) {
    return notFound()
  }

  const t = await getTranslations('teacherClasses')
  const locale = await getLocale()
  const createdDate = new Date(classData.created_at)
  const createdLabel = t('created')
  const createdFormatted = createdDate.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })

  const shareExamLabels = {
    shareButton: t('shareExamButton'),
    modalTitle: t('shareExamModalTitle'),
    modalSubtitleSelect: t('shareExamModalSubtitle'),
    searchPlaceholder: t('searchExamsPlaceholder'),
    selectAll: t('selectAll'),
    selected: t('selected'),
    noExamsAvailable: t('noExamsAvailable'),
    noExamsMatchSearch: t('noExamsMatchSearch'),
    allExamsShared: t('allExamsShared'),
    published: t('published'),
    draft: t('draft'),
    questions: t('questionsCount'),
    cancel: t('cancel'),
    share: t('share'),
    sharing: t('sharing'),
    shareSuccess: t('shareExamSuccess', { count: '{count}', className: '{className}' }),
  }
  const shareDocumentLabels = {
    shareButton: t('shareDocumentButton'),
    modalTitle: t('shareDocumentModalTitle'),
    modalSubtitleSelect: t('shareDocumentModalSubtitle'),
    searchPlaceholder: t('searchDocumentsPlaceholder'),
    selectAll: t('selectAll'),
    selected: t('selected'),
    noDocumentsAvailable: t('noDocumentsAvailable'),
    noDocumentsMatchSearch: t('noDocumentsMatchSearch'),
    allDocumentsShared: t('allDocumentsShared'),
    cancel: t('cancel'),
    share: t('share'),
    sharing: t('sharing'),
    shareSuccess: t('shareDocumentSuccess', { count: '{count}', className: '{className}' }),
  }
  const shareLessonLabels = {
    shareButton: t('shareLessonButton'),
    modalTitle: t('shareLessonModalTitle'),
    modalSubtitleSelect: t('shareLessonModalSubtitle'),
    searchPlaceholder: t('searchLessonsPlaceholder'),
    selectAll: t('selectAll'),
    selected: t('selected'),
    noLessonsAvailable: t('noLessonsAvailable'),
    noLessonsMatchSearch: t('noLessonsMatchSearch'),
    allLessonsShared: t('allLessonsShared'),
    published: t('published'),
    draft: t('draft'),
    cancel: t('cancel'),
    share: t('share'),
    sharing: t('sharing'),
    shareSuccess: t('shareLessonSuccess', { count: '{count}', className: '{className}' }),
  }
  const sharedContentListLabels = {
    removeExamTitle: t('removeExamTitle'),
    removeDocumentTitle: t('removeDocumentTitle'),
    removeLessonTitle: t('removeLessonTitle'),
    removeConfirmMessage: t('removeConfirmMessage', { title: '{title}', type: '{type}' }),
    typeExam: t('typeExam'),
    typeDocument: t('typeDocument'),
    typeLesson: t('typeLesson'),
    keep: t('keep'),
    remove: t('remove'),
    removing: t('removing'),
    examRemovedFromClass: t('examRemovedFromClass'),
    documentRemovedFromClass: t('documentRemovedFromClass'),
    lessonRemovedFromClass: t('lessonRemovedFromClass'),
    sharedExams: t('sharedExams'),
    sharedDocuments: t('sharedDocuments'),
    sharedLessons: t('sharedLessons'),
    examCount: t('examCount'),
    documentCount: t('documentCount'),
    lessonCount: t('lessonCount'),
    noExamsSharedYet: t('noExamsSharedYet'),
    noDocumentsSharedYet: t('noDocumentsSharedYet'),
    noLessonsSharedYet: t('noLessonsSharedYet'),
    useShareExamButtonAbove: t('useShareExamButtonAbove'),
    useShareDocumentButtonAbove: t('useShareDocumentButtonAbove'),
    useShareLessonButtonAbove: t('useShareLessonButtonAbove'),
    view: t('view'),
    viewExam: t('viewExam'),
    viewLesson: t('viewLesson'),
    open: t('open'),
    removeFromClass: t('removeFromClass'),
    published: t('published'),
    draft: t('draft'),
    questions: t('questionsCount'),
  }

  const enrollLabels = {
    addStudentsButton: t('enrollAddStudentsButton'),
    modalTitle: t('enrollModalTitle'),
    modalSubtitleErp: t('enrollModalSubtitleErp'),
    modalSubtitleSaas: t('enrollModalSubtitleSaas'),
    filterByUnit: t('enrollFilterByUnit'),
    filterByUnitOptional: t('enrollFilterOptional'),
    allUnits: t('enrollAllUnits'),
    searchPlaceholderErp: t('enrollSearchPlaceholderErp'),
    searchPlaceholderSaas: t('enrollSearchPlaceholderSaas'),
    loadingStudents: t('enrollLoadingStudents'),
    searching: t('enrollSearching'),
    noStudentsInUnit: t('enrollNoStudentsInUnit'),
    noStudentsToEnroll: t('enrollNoStudentsToEnroll'),
    noStudentsFound: t('enrollNoStudentsFound'),
    startTypingToSearch: t('enrollStartTypingToSearch'),
    showAllUnits: t('enrollShowAllUnits'),
    studentsSelected: t('enrollStudentsSelected'),
    studentsSelectedPlural: t('enrollStudentsSelectedPlural', { count: '{count}' }),
    selectAtLeastOne: t('enrollSelectAtLeastOne'),
    cancel: t('cancel'),
    adding: t('enrollAdding'),
    addingShort: t('enrollAddingShort'),
    add: t('enrollAdd'),
  }

  const aiTutorLabels = {
    title: t('aiTutorTitle'),
    descriptionConnected: t('aiTutorDescriptionConnected'),
    descriptionNotConnected: t('aiTutorDescriptionNotConnected'),
    chatTitleFallback: t('aiTutorChatTitleFallback'),
    lastUpdated: t('aiTutorLastUpdated'),
    subjectLabel: t('aiTutorSubjectLabel'),
    gradeLabel: t('aiTutorGradeLabel'),
    documentsContext: t('aiTutorDocumentsContext'),
    documentsContextPlural: t('aiTutorDocumentsContextPlural', { count: '{count}' }),
    openChat: t('aiTutorOpenChat'),
    unlink: t('aiTutorUnlink'),
    creating: t('aiTutorCreating'),
    createNewChat: t('aiTutorCreateNewChat'),
    loading: t('aiTutorLoading'),
    linkExistingChat: t('aiTutorLinkExistingChat'),
    viewAllChats: t('aiTutorViewAllChats'),
    linkDialogTitle: t('aiTutorLinkDialogTitle'),
    linkDialogSubtitle: t('aiTutorLinkDialogSubtitle'),
    noChatsToLink: t('aiTutorNoChatsToLink'),
    untitledChat: t('aiTutorUntitledChat'),
    failedToLoadConversations: t('aiTutorFailedToLoad'),
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Back Link */}
      <Link
        href="/teacher/classes"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{t('backToMyClasses')}</span>
      </Link>

      {/* Header Section */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-4 sm:p-6 lg:p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/20" />
          <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-white/20" />
        </div>
        <div className="relative flex flex-col gap-4 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-xl font-bold truncate sm:text-2xl lg:text-3xl" title={classData.name}>{classData.name}</h1>
                {classData.is_active ? (
                  <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-green-400/20 px-2 py-0.5 text-xs font-medium text-green-100">
                    <CheckCircle className="h-3 w-3" />
                    {t('active')}
                  </span>
                ) : (
                  <span className="inline-flex flex-shrink-0 rounded-full bg-gray-400/20 px-2 py-0.5 text-xs font-medium text-gray-200">{t('inactive')}</span>
                )}
              </div>
              {classData.description && (
                <p className="text-blue-100 text-sm mt-1 line-clamp-2 sm:line-clamp-none max-w-xl">{classData.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 sm:mt-3 text-xs sm:text-sm text-blue-200">
                {classData.subject && (
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {classData.subject}
                  </span>
                )}
                {classData.grade_level && (
                  <span className="flex-shrink-0 bg-white/10 rounded-full px-2 py-0.5">{classData.grade_level}</span>
                )}
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <Calendar className="h-3.5 w-3.5" />
                  {createdLabel} {createdFormatted}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm p-3 sm:p-4 lg:min-w-[180px] flex-shrink-0">
            <p className="text-xs font-medium text-blue-200 mb-1">{t('classCode')}</p>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <code className="text-base sm:text-lg font-bold font-mono truncate" title={classData.class_code || ''}>{classData.class_code}</code>
              <button
                type="button"
                className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                title={t('copyClassCode')}
              >
                <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <p className="text-[10px] sm:text-xs text-blue-300 mt-1">{t('shareWithStudents')}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-lg sm:rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">{t('students')}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{enrolledStudents.length}</p>
            </div>
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-lg sm:rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">{t('exams')}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{stats.exams}</p>
            </div>
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-lg sm:rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">{t('documents')}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{stats.documents}</p>
            </div>
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </div>
        <div className="rounded-lg sm:rounded-xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500">{t('lessons')}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{stats.lessons}</p>
            </div>
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Share Existing Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">{t('shareExistingContent')}</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{t('shareExistingContentHint')}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
          <div className="rounded-lg sm:rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{t('shareExams')}</h3>
                <p className="text-xs text-gray-500">{availableExams.length} {t('available')}</p>
              </div>
            </div>
            <ShareExamDialog
              classId={classId}
              className={classData.name}
              availableExams={availableExams}
              onShareExams={shareExamsWithClass}
              labels={shareExamLabels}
            />
          </div>
          
          <div className="rounded-lg sm:rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{t('shareDocuments')}</h3>
                <p className="text-xs text-gray-500">{availableDocuments.length} {t('available')}</p>
              </div>
            </div>
            <ShareDocumentDialog
              classId={classId}
              className={classData.name}
              availableDocuments={availableDocuments}
              onShareDocuments={shareDocumentsWithClass}
              labels={shareDocumentLabels}
            />
          </div>
          <div className="rounded-lg sm:rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{t('shareLessons')}</h3>
                <p className="text-xs text-gray-500">{availableLessons.length} {t('available')}</p>
              </div>
            </div>
            <ShareLessonDialog
              classId={classId}
              className={classData.name}
              availableLessons={availableLessons}
              onShareLessons={shareLessonsWithClass}
              labels={shareLessonLabels}
            />
          </div>
        </div>
      </div>

      {/* Shared Content Lists */}
      <SharedContentList
        classId={classId}
        sharedExams={sharedExams}
        sharedDocuments={sharedDocuments}
        sharedLessons={sharedLessons}
        onRemoveExam={removeExamFromClass}
        onRemoveDocument={removeDocumentFromClass}
        onRemoveLesson={removeLessonFromClass}
        labels={sharedContentListLabels}
      />

      {/* Enrolled Students Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">{t('enrolledStudents')}</h2>
              <p className="text-xs sm:text-sm text-gray-500">{enrolledStudents.length === 1 ? t('studentsCount', { count: 1 }) : t('studentsCountPlural', { count: enrolledStudents.length })}</p>
            </div>
          </div>
          <EnrollStudentClient
            classId={classId}
            organizationId={organizationId}
            availableStudents={[]}
            labels={enrollLabels}
          />
        </div>
        {enrolledStudents.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3 sm:mb-4">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('noStudentsEnrolled')}</h3>
            <p className="text-xs sm:text-sm text-gray-500">{t('noStudentsHintAssigned')}</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:gap-3 p-3 sm:p-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledStudents.map((enrollment: { id: string; student?: { full_name: string | null; email: string; avatar_url?: string | null } | null }) => {
              const displayName = enrollment.student?.full_name?.trim() || enrollment.student?.email || t('studentFallback')
              return (
                <div key={enrollment.id} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-gray-100 bg-gray-50 p-2.5 sm:p-3 hover:bg-gray-100 transition-colors min-w-0">
                  <Avatar
                    src={enrollment.student?.avatar_url}
                    name={displayName}
                    size="sm"
                    className="flex-shrink-0 sm:h-9 sm:w-9"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate text-sm" title={displayName}>{displayName}</p>
                    {enrollment.student?.email && (
                      <p className="text-xs text-gray-500 truncate" title={enrollment.student.email}>{enrollment.student.email}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI Tutor Chat Section */}
      <ClassAITutor
        classId={classId}
        className={classData.name}
        subject={classData.subject}
        gradeLevel={classData.grade_level}
        classDocuments={sharedDocuments.map(doc => ({
          id: doc.id,
          title: doc.title,
          file_type: doc.file_type,
        }))}
        existingConversation={classConversation}
        labels={aiTutorLabels}
        onCreateConversation={createConversation}
        onUpdateConversation={updateConversation}
        onGetConversations={getConversations}
      />

      {/* Quick Tips Section */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1.5">{t('tipsForClass')}</h3>
            <ul className="space-y-1.5 text-xs sm:text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t('tip1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t('tip2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t('tip3')}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
