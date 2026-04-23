import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { StudentLessonsList } from '@eduator/ui'
import type { StudentLessonsListTranslations } from '@eduator/ui'
import { getAvailableLessons } from '@eduator/core/utils/student-lessons'

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

export default async function StudentLessonsPage() {
  const studentData = await getStudentId()
  
  if (!studentData) {
    redirect('/auth/login')
  }
  
  const { studentId, organizationId } = studentData
  
  if (!organizationId) redirect('/auth/access-denied')

  const [supabase, t] = await Promise.all([createServerClient(), getTranslations('studentLessons')])
  const lessons = await getAvailableLessons(supabase, studentId, organizationId)

  const translations: StudentLessonsListTranslations = {
    title: t('title'),
    subtitle: t('subtitle'),
    showingCount: t('showingCount'),
    availableLessons: t('availableLessons'),
    published: t('published'),
    completed: t('completed'),
    searchPlaceholder: t('searchPlaceholder'),
    status: t('status'),
    all: t('all'),
    notCompleted: t('notCompleted'),
    class: t('class'),
    noLessonsFound: t('noLessonsFound'),
    noLessonsAvailable: t('noLessonsAvailable'),
    tryAdjustingSearch: t('tryAdjustingSearch'),
    noLessonsHint: t('noLessonsHint'),
    createdBy: t('createdBy'),
    voice: t('voice'),
    images: t('images'),
    quiz: t('quiz'),
    view: t('view'),
    available: t('available'),
    unused: t('unused'),
  }

  return <StudentLessonsList lessons={lessons} translations={translations} />
}
