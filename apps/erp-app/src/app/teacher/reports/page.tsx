import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { TeacherReportsClient } from '@eduator/ui'
import { getTeacherStats } from './server-utils'

async function getTeacherInfo() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, full_name')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) return null
  
  return { teacherId: profile.id, organizationId: profile.organization_id, teacherName: profile.full_name }
}

export default async function TeacherReportsPage() {
  const teacherData = await getTeacherInfo()
  const t = await getTranslations('teacherReports')

  if (!teacherData) {
    redirect('/auth/login')
  }

  const { teacherId, organizationId } = teacherData

  // Only load overview stats initially for faster page load
  const initialStats = await getTeacherStats(teacherId, organizationId, 'overview')

  return (
    <TeacherReportsClient
      teacherId={teacherId}
      organizationId={organizationId}
      initialStats={initialStats}
      accentColor="blue"
      labels={{
        title: t('title'),
        subtitle: t('subtitle'),
        activityTrend: t('activityTrend'),
        last6MonthsOverview: t('last6MonthsOverview'),
        itemsCreated: t('itemsCreated'),
        contentDistribution: t('contentDistribution'),
        contentBreakdown: t('contentBreakdown'),
        exams: t('exams'),
        lessons: t('lessons'),
        documents: t('documents'),
        noStudentPerformanceData: t('noStudentPerformanceData'),
        needsAttention: t('needsAttention'),
        noRiskSignals: t('noRiskSignals'),
      }}
    />
  )
}
