'use server'

import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { revalidatePath } from 'next/cache'

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

export async function joinClassByCode(code: string) {
  const studentData = await getStudentId()
  
  if (!studentData) {
    return { success: false, error: 'Not authenticated' }
  }
  
  const { studentId, organizationId } = studentData
  const supabase = await createServerClient()
  
  // Find class by code
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, is_active')
    .eq('class_code', code.toUpperCase())
    .eq('organization_id', organizationId)
    .single()
  
  if (classError || !classData) {
    return { success: false, error: 'Class not found' }
  }
  
  if (!classData.is_active) {
    return { success: false, error: 'Class is not active' }
  }
  
  // Check if already enrolled
  const { data: existing } = await supabase
    .from('class_enrollments')
    .select('id')
    .eq('class_id', classData.id)
    .eq('student_id', studentId)
    .single()
  
  if (existing) {
    return { success: false, error: 'You are already enrolled in this class' }
  }
  
  // Enroll student
  const { error: enrollError } = await supabase
    .from('class_enrollments')
    .insert({
      class_id: classData.id,
      student_id: studentId,
      status: 'active',
    })
  
  if (enrollError) {
    console.error('Error enrolling student:', enrollError)
    return { success: false, error: enrollError.message }
  }
  
  revalidatePath('/student/classes')
  return { success: true }
}
