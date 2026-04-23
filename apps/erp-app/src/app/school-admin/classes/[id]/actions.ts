'use server'

import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { revalidatePath } from 'next/cache'

async function verifyOrganizationAccess(classId: string) {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated', organizationId: null }
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) {
    return { error: 'No organization found', organizationId: null }
  }

  // Verify class belongs to organization
  const adminClient = createAdminClient()
  const { data: classData } = await adminClient
    .from('classes')
    .select('id')
    .eq('id', classId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!classData) {
    return { error: 'Class not found', organizationId: null }
  }

  return { error: null, organizationId: profile.organization_id }
}

export async function addTeacherToClass(classId: string, teacherId: string) {
  const { error: accessError } = await verifyOrganizationAccess(classId)
  if (accessError) {
    return { error: accessError }
  }

  const adminClient = createAdminClient()

  // Check if teacher is already in this class
  const { data: existing } = await adminClient
    .from('class_teachers')
    .select('id')
    .eq('class_id', classId)
    .eq('teacher_id', teacherId)
    .single()

  if (existing) {
    return { error: 'Teacher is already assigned to this class' }
  }

  // Add teacher to class (no role - all teachers are equal)
  const { error } = await adminClient
    .from('class_teachers')
    .insert({
      class_id: classId,
      teacher_id: teacherId,
    })

  if (error) {
    console.error('Error adding teacher to class:', error)
    return { error: error.message }
  }

  revalidatePath(`/school-admin/classes/${classId}`)
  return { success: true }
}

export async function removeTeacherFromClass(classId: string, teacherId: string) {
  const { error: accessError } = await verifyOrganizationAccess(classId)
  if (accessError) {
    return { error: accessError }
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('class_teachers')
    .delete()
    .eq('class_id', classId)
    .eq('teacher_id', teacherId)

  if (error) {
    console.error('Error removing teacher from class:', error)
    return { error: error.message }
  }

  revalidatePath(`/school-admin/classes/${classId}`)
  return { success: true }
}

export async function enrollStudentInClass(classId: string, studentId: string) {
  const { error: accessError } = await verifyOrganizationAccess(classId)
  if (accessError) {
    return { error: accessError }
  }

  const adminClient = createAdminClient()

  // Check if student is already enrolled
  const { data: existing } = await adminClient
    .from('class_enrollments')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .single()

  if (existing) {
    return { error: 'Student is already enrolled in this class' }
  }

  // Enroll student
  const { error } = await adminClient
    .from('class_enrollments')
    .insert({
      class_id: classId,
      student_id: studentId,
      status: 'active',
    })

  if (error) {
    console.error('Error enrolling student:', error)
    return { error: error.message }
  }

  revalidatePath(`/school-admin/classes/${classId}`)
  return { success: true }
}

export async function unenrollStudentFromClass(classId: string, studentId: string) {
  const { error: accessError } = await verifyOrganizationAccess(classId)
  if (accessError) {
    return { error: accessError }
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('class_enrollments')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', studentId)

  if (error) {
    console.error('Error unenrolling student:', error)
    return { error: error.message }
  }

  revalidatePath(`/school-admin/classes/${classId}`)
  return { success: true }
}
