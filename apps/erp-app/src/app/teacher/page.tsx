import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { TeacherDashboardClient } from '@eduator/ui'
import type { Exam, Document, ClassData, TeacherDashboardTranslations } from '@eduator/ui'

type SupabaseClient = Awaited<ReturnType<typeof createServerClient>>
type AdminClient = ReturnType<typeof createAdminClient>

async function getTeacherInfo(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations(*)
    `)
    .eq('user_id', user.id)
    .single()

  if (!profile) return null

  const org = Array.isArray(profile.organizations)
    ? profile.organizations[0]
    : profile.organizations

  return { profile, organization: org, profileId: profile.id }
}

async function getTeacherStats(supabase: SupabaseClient, adminClient: AdminClient, teacherId: string, organizationId: string) {

  // Use admin client for classes/enrollments so RLS (auth.uid vs profile id) doesn't hide rows
  const { data: primaryClasses } = await adminClient
    .from('classes')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('teacher_id', teacherId)

  const { data: classTeachers } = await adminClient
    .from('class_teachers')
    .select('class_id')
    .eq('teacher_id', teacherId)

  const assignedClassIds = classTeachers?.map((ct) => ct.class_id) || []

  let additionalClasses: Array<{ id: string; name: string }> = []
  if (assignedClassIds.length > 0) {
    const { data: additional } = await adminClient
      .from('classes')
      .select('id, name')
      .eq('organization_id', organizationId)
      .in('id', assignedClassIds)
      .neq('teacher_id', teacherId)
    additionalClasses = additional || []
  }

  const allClassIds = [
    ...(primaryClasses?.map((c) => c.id) || []),
    ...additionalClasses.map((c) => c.id),
  ]
  const classIds = Array.from(new Set(allClassIds))

  let studentCount = 0
  if (classIds.length > 0) {
    const { count } = await adminClient
      .from('class_enrollments')
      .select('student_id', { count: 'exact', head: true })
      .eq('status', 'active')
      .in('class_id', classIds)
    studentCount = count || 0
  }

  const [examsResult, lessonsResult, documentsResult, publishedExamsResult] = await Promise.all([
    supabase
      .from('exams')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('created_by', teacherId)
      .eq('is_archived', false),
    supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('created_by', teacherId)
      .eq('is_archived', false)
      .or('course_generated.eq.0,course_generated.is.null'),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('created_by', teacherId)
      .eq('is_archived', false),
    supabase
      .from('exams')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('created_by', teacherId)
      .eq('is_published', true)
      .eq('is_archived', false),
  ])

  return {
    classes: classIds.length,
    exams: examsResult.count || 0,
    publishedExams: publishedExamsResult.count || 0,
    lessons: lessonsResult.count || 0,
    documents: documentsResult.count || 0,
    students: studentCount,
  }
}

async function getRecentExams(supabase: SupabaseClient, teacherId: string, organizationId: string): Promise<Exam[]> {
  const { data: exams, error } = await supabase
    .from('exams')
    .select('id, title, is_published, created_at, questions, language, translations')
    .eq('organization_id', organizationId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('Error fetching recent exams:', error)
    return []
  }
  
  return exams || []
}

async function getRecentDocuments(supabase: SupabaseClient, teacherId: string, organizationId: string): Promise<Document[]> {
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, title, file_type, file_size, created_at, file_url')
    .eq('organization_id', organizationId)
    .eq('created_by', teacherId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('Error fetching recent documents:', error)
    return []
  }
  
  return documents || []
}

async function getRecentClasses(adminClient: AdminClient, teacherId: string, organizationId: string): Promise<ClassData[]> {
  const { data: primaryClasses, error: primaryError } = await adminClient
    .from('classes')
    .select('id, name, class_code, description, is_active, created_at, teacher_id')
    .eq('organization_id', organizationId)
    .eq('teacher_id', teacherId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (primaryError) {
    console.error('Error fetching primary classes:', primaryError)
  }

  const { data: classTeachers, error: ctError } = await adminClient
    .from('class_teachers')
    .select('class_id')
    .eq('teacher_id', teacherId)

  if (ctError) {
    console.error('Error fetching class_teachers:', ctError)
  }

  const assignedClassIds = classTeachers?.map((ct) => ct.class_id) || []
  let additionalClasses: ClassData[] = []
  if (assignedClassIds.length > 0) {
    const { data: additional, error: additionalError } = await adminClient
      .from('classes')
      .select('id, name, class_code, description, is_active, created_at, teacher_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('id', assignedClassIds)
      .order('created_at', { ascending: false })

    if (!additionalError && additional) {
      additionalClasses = additional.filter((c) => c.teacher_id !== teacherId)
    }
  }

  const allClasses = [...(primaryClasses || []), ...additionalClasses]
  const uniqueClasses = Array.from(new Map(allClasses.map((c) => [c.id, c])).values())

  return uniqueClasses
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
}


export default async function TeacherDashboard() {
  const supabase = await createServerClient()
  const adminClient = createAdminClient()
  const data = await getTeacherInfo(supabase)

  if (!data?.profile) {
    redirect('/auth/login')
  }

  const { profile, organization, profileId } = data

  if (!profile.organization_id) redirect('/auth/access-denied')

  const td = await getTranslations('teacherDashboard')

  const translations: TeacherDashboardTranslations = {
    goodMorning: td('goodMorning'),
    goodAfternoon: td('goodAfternoon'),
    goodEvening: td('goodEvening'),
    teacher: td('teacher'),
    newExam: td('newExam'),
    uploadDocument: td('uploadDocument'),
    lessonsLink: td('lessonsLink'),
    classes: td('classes'),
    exams: td('exams'),
    nPublished: td('nPublished'),
    documents: td('documents'),
    lessonsLabel: td('lessonsLabel'),
    students: td('students'),
    inNClasses: td('inNClasses'),
    atAGlance: td('atAGlance'),
    publishedExamsReady: td('publishedExamsReady'),
    activeStudents: td('activeStudents'),
    documentsInLibrary: td('documentsInLibrary'),
    getStarted: td('getStarted'),
    recentExams: td('recentExams'),
    yourLatestExams: td('yourLatestExams'),
    viewAll: td('viewAll'),
    all: td('all'),
    noExamsYet: td('noExamsYet'),
    createFirstExam: td('createFirstExam'),
    nQuestions: td('nQuestions'),
    published: td('published'),
    draft: td('draft'),
    recentDocuments: td('recentDocuments'),
    yourUploadedFiles: td('yourUploadedFiles'),
    noDocumentsYet: td('noDocumentsYet'),
    uploadFirstDocument: td('uploadFirstDocument'),
    openFile: td('openFile'),
    openDocumentLibrary: td('openDocumentLibrary'),
    yourClasses: td('yourClasses'),
    classesYouTeach: td('classesYouTeach'),
    noClassesYet: td('noClassesYet'),
    contactAdmin: td('contactAdmin'),
    createFirstClass: td('createFirstClass'),
    inactive: td('inactive'),
    view: td('view'),
    today: td('today'),
    yesterday: td('yesterday'),
    nDaysAgo: td('nDaysAgo'),
  }

  const [stats, recentExams, recentDocuments, recentClasses] = await Promise.all([
    getTeacherStats(supabase, adminClient, profileId, profile.organization_id),
    getRecentExams(supabase, profileId, profile.organization_id),
    getRecentDocuments(supabase, profileId, profile.organization_id),
    getRecentClasses(adminClient, profileId, profile.organization_id),
  ])

  return (
    <TeacherDashboardClient
      profile={profile}
      organization={organization || null}
      stats={stats}
      recentExams={recentExams}
      recentDocuments={recentDocuments}
      recentClasses={recentClasses}
      variant="erp"
      translations={translations}
    />
  )
}
