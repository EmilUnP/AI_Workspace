import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getTranslations, getMessages } from 'next-intl/server'
import { StudentClassDetailClient } from '@eduator/ui'
import type { StudentClassDetailClientTranslations } from '@eduator/ui'
import { getClassDetails, getSharedExams, getSharedDocuments, getSharedLessons, getEnrolledStudents, getClassTeachers } from '@eduator/core/utils/student-class-detail'

async function getSharedEducationPlan(supabase: Awaited<ReturnType<typeof createServerClient>>, classId: string) {
  try {
    const { data } = await supabase
      .from('education_plans')
      .select('id, name, description, period_months, sessions_per_week, hours_per_session, content')
      .eq('class_id', classId)
      .eq('is_shared_with_students', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data
  } catch {
    return null
  }
}

async function getStudentId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) return null
  
  return { studentId: profile.id, organizationId: profile.organization_id }
}

export default async function StudentClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: classId } = await params
  const studentData = await getStudentId()
  
  if (!studentData) {
    redirect('/auth/login')
  }
  
  const { studentId, organizationId } = studentData
  
  if (!organizationId) redirect('/auth/access-denied')

  const [supabase, t, messages] = await Promise.all([
    createServerClient(),
    getTranslations('studentClassDetail'),
    getMessages(),
  ])
  const detailMsg = (messages as Record<string, unknown>)?.studentClassDetail as Record<string, string> | undefined
  
  const [classData, sharedExams, sharedDocuments, sharedLessons, enrolledStudents, teachers, educationPlan] = await Promise.all([
    getClassDetails(supabase, classId, studentId, organizationId),
    getSharedExams(supabase, classId, studentId, organizationId),
    getSharedDocuments(supabase, classId, organizationId),
    getSharedLessons(supabase, classId, organizationId),
    getEnrolledStudents(supabase, classId),
    getClassTeachers(supabase, classId),
    getSharedEducationPlan(supabase, classId),
  ])
  
  if (!classData) {
    return notFound()
  }

  const translations: StudentClassDetailClientTranslations = {
    backToMyClasses: t('backToMyClasses'),
    classCode: t('classCode'),
    created: t('created'),
    people: t('people'),
    content: t('content'),
    plan: t('plan'),
    teachers: t('teachers'),
    teachersCount: typeof detailMsg?.teachersCount === 'string' ? detailMsg.teachersCount : '{count} teacher assigned to this class',
    teachersCount_other: typeof detailMsg?.teachersCount_other === 'string' ? detailMsg.teachersCount_other : '{count} teachers assigned to this class',
    noTeachersAssigned: t('noTeachersAssigned'),
    teachersWillAppear: t('teachersWillAppear'),
    primary: t('primary'),
    students: t('students'),
    studentsCount: typeof detailMsg?.studentsCount === 'string' ? detailMsg.studentsCount : '{count} student in this class',
    studentsCount_other: typeof detailMsg?.studentsCount_other === 'string' ? detailMsg.studentsCount_other : '{count} students in this class',
    noStudentsEnrolled: t('noStudentsEnrolled'),
    studentsWillAppear: t('studentsWillAppear'),
    filterByTeacher: t('filterByTeacher'),
    allTeachers: t('allTeachers'),
    teacher: t('teacher'),
    availableExams: t('availableExams'),
    examsCount: typeof detailMsg?.examsCount === 'string' ? detailMsg.examsCount : '{count} exam available',
    examsCount_other: typeof detailMsg?.examsCount_other === 'string' ? detailMsg.examsCount_other : '{count} exams available',
    done: t('done'),
    available: t('available'),
    draft: t('draft'),
    questions: t('questions'),
    min: t('min'),
    createdBy: t('createdBy'),
    documents: t('documents'),
    documentsCount: typeof detailMsg?.documentsCount === 'string' ? detailMsg.documentsCount : '{count} document available',
    documentsCount_other: typeof detailMsg?.documentsCount_other === 'string' ? detailMsg.documentsCount_other : '{count} documents available',
    lessons: t('lessons'),
    lessonsCount: typeof detailMsg?.lessonsCount === 'string' ? detailMsg.lessonsCount : '{count} lesson available',
    lessonsCount_other: typeof detailMsg?.lessonsCount_other === 'string' ? detailMsg.lessonsCount_other : '{count} lessons available',
    noContentYet: t('noContentYet'),
    noContentHint: t('noContentHint'),
    week: t('week'),
    objectives: t('objectives'),
    planPeriod: typeof detailMsg?.planPeriod === 'string' ? detailMsg.planPeriod : '{months} month(s)',
    planSessions: typeof detailMsg?.planSessions === 'string' ? detailMsg.planSessions : '{count} session(s)/week',
    planHours: typeof detailMsg?.planHours === 'string' ? detailMsg.planHours : '{hours}h per session',
    studentLabel: t('studentLabel'),
  }

  return (
    <StudentClassDetailClient
      classData={classData}
      sharedExams={sharedExams}
      sharedDocuments={sharedDocuments}
      sharedLessons={sharedLessons}
      enrolledStudents={enrolledStudents}
      teachers={teachers}
      educationPlan={educationPlan}
      translations={translations}
    />
  )
}
