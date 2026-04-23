import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations, getMessages } from 'next-intl/server'
import { StudentClassesClient } from './student-classes-client'
import type { StudentClassesListLabels } from '@eduator/ui'
import { getEnrolledClasses } from '@eduator/core/utils/student-classes'

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


export default async function StudentClassesPage() {
  const studentData = await getStudentId()
  
  if (!studentData) {
    redirect('/auth/login')
  }
  
  const { studentId, organizationId } = studentData
  
  if (!organizationId) redirect('/auth/access-denied')

  const [supabase, t, messages] = await Promise.all([
    createServerClient(),
    getTranslations('studentClasses'),
    getMessages(),
  ])
  const classes = await getEnrolledClasses(supabase, studentId)

  const studentClassesMsg = (messages as Record<string, unknown>)?.studentClasses as Record<string, string> | undefined

  const labels: StudentClassesListLabels = {
    myClasses: t('myClasses'),
    subtitle: t('subtitle'),
    showingCount: typeof studentClassesMsg?.showingCount === 'string' ? studentClassesMsg.showingCount : 'Showing {count} of {total}',
    enrolledCount: t('enrolledCount'),
    joinClass: t('joinClass'),
    joinClassWithCode: t('joinClassWithCode'),
    classCode: t('classCode'),
    enterClassCode: t('enterClassCode'),
    cancel: t('cancel'),
    joining: t('joining'),
    noClassesEnrolled: t('noClassesEnrolled'),
    noClassesFound: t('noClassesFound'),
    tryAdjustingSearch: t('tryAdjustingSearch'),
    emptyHintJoin: t('emptyHintJoin'),
    emptyHintAdmin: t('emptyHintAdmin'),
    searchPlaceholder: t('searchPlaceholder'),
    pendingSectionTitle: t('pendingSectionTitle'),
    pendingCardDescription: t('pendingCardDescription'),
    joinSuccessPending: t('joinSuccessPending'),
    quickTip: t('quickTip'),
    quickTipText: t('quickTipText'),
    newBadge: t('newBadge'),
    view: t('view'),
    failedToJoin: t('failedToJoin'),
    errorJoining: t('errorJoining'),
  }

  return <StudentClassesClient classes={classes} labels={labels} />
}
