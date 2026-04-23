import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { TeacherClassesList } from '@eduator/ui'
import { calculateEnrollmentCounts, addEnrollmentCounts } from '@eduator/core/utils/teacher-classes'

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
  const supabase = await createServerClient()
  const adminClient = createAdminClient()
  
  // Get classes where teacher is the primary teacher
  const { data: primaryClasses, error: primaryError } = await supabase
    .from('classes')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('teacher_id', teacherId)
    .eq('is_active', true)
  
  if (primaryError) {
    console.error('Error fetching primary classes:', JSON.stringify(primaryError, null, 2))
  }
  
  // Get class IDs where teacher is assigned via class_teachers
  // Use admin client to bypass RLS (teachers need to see their own assignments)
  const { data: classTeachers, error: ctError } = await adminClient
    .from('class_teachers')
    .select('class_id')
    .eq('teacher_id', teacherId)
  
  if (ctError) {
    console.error('Error fetching class_teachers:', JSON.stringify(ctError, null, 2))
  }
  
  const assignedClassIds = classTeachers?.map(ct => ct.class_id) || []
  
  // Get additional classes where teacher is assigned (not primary)
  let additionalClasses: Array<{ id: string; name: string }> = []
  if (assignedClassIds.length > 0) {
    const { data: additional, error: additionalError } = await supabase
      .from('classes')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('id', assignedClassIds)
    
    if (additionalError) {
      console.error('Error fetching additional classes:', JSON.stringify(additionalError, null, 2))
    } else {
      // Filter out classes where teacher is already the primary teacher (to avoid duplicates)
      additionalClasses = (additional || []).filter(c => c.teacher_id !== teacherId)
    }
  }
  
  // Combine and deduplicate classes
  const allClasses = [...(primaryClasses || []), ...additionalClasses]
  const uniqueClasses = Array.from(
    new Map(allClasses.map(c => [c.id, c])).values()
  )
  
  if (uniqueClasses.length === 0) {
    return []
  }
  
  const classIds = uniqueClasses.map(c => c.id)
  
  // Get enrollment counts using shared utility
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .in('class_id', classIds)
    .eq('status', 'active')
  
  const enrollmentCounts = calculateEnrollmentCounts(uniqueClasses, enrollments || [])
  
  // Sort by created_at descending
  const sortedClasses = uniqueClasses.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  
  return addEnrollmentCounts(sortedClasses, enrollmentCounts)
}


export default async function TeacherClassesPage() {
  const teacherData = await getTeacherId()
  const t = await getTranslations('teacherClasses')

  if (!teacherData) {
    redirect('/auth/login')
  }

  const { teacherId, organizationId } = teacherData
  const classes = await getClasses(teacherId, organizationId)

  const listLabels = {
    title: t('title'),
    subtitle: t('subtitle'),
    createClass: t('createClass'),
    classes: t('classes'),
    students: t('students'),
    noClassesAssigned: t('noClassesAssigned'),
    noClassesCreated: t('noClassesCreated'),
    emptyAssignedHint: t('emptyAssignedHint'),
    emptyCreatedHint: t('emptyCreatedHint'),
    checkBackSoon: t('checkBackSoon'),
    clickToCreateFirst: t('clickToCreateFirst'),
    newBadge: t('newBadge'),
    studentsShort: t('studentsShort'),
    studentsAbbr: t('studentsAbbr'),
    view: t('view'),
    quickTip: t('quickTip'),
    quickTipText: t('quickTipText'),
  }

  return (
    <TeacherClassesList
      classes={classes}
      variant="erp"
      showCreateButton={false}
      labels={listLabels}
    />
  )
}
