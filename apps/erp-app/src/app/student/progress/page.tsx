import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { getAvailableLessons } from '@eduator/core/utils/student-lessons'
import { getAvailableExams } from '@eduator/core/utils/student-exams'
import { StudentProgressClient } from './student-progress-client'

async function getStudentContext() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile?.organization_id) {
    // If no organization, this student belongs in the ERP tenant
    return null
  }

  return { studentId: profile.id as string, organizationId: profile.organization_id as string }
}

export default async function StudentProgressPage() {
  const ctx = await getStudentContext()

  if (!ctx) redirect('/auth/access-denied')

  const { studentId, organizationId } = ctx

  const supabase = await createServerClient()

  const [lessons, exams] = await Promise.all([
    getAvailableLessons(supabase, studentId, organizationId),
    getAvailableExams(supabase, studentId, organizationId),
  ])

  return <StudentProgressClient lessons={lessons} exams={exams} />
}

