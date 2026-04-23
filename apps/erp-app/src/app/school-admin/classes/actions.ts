'use server'

import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { revalidatePath } from 'next/cache'

// Helper to get current user's organization
async function getCurrentOrganizationId() {
  const supabase = await createServerClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  
  return profile?.organization_id
}

export async function createClass(formData: FormData) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) {
    return { error: 'Not authenticated or no organization' }
  }
  
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  
  if (!name) {
    return { error: 'Class name is required' }
  }
  
  // Generate unique class code
  const classCode = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  
  const { data, error } = await supabase
    .from('classes')
    .insert({
      organization_id: organizationId,
      name,
      description: description || null,
      teacher_id: null,
      class_code: classCode,
      is_active: true,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating class:', error)
    return { error: error.message }
  }
  
  revalidatePath('/school-admin/classes')
  return { success: true, classId: data.id }
}

export async function updateClass(classId: string, formData: FormData) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) {
    return { error: 'Not authenticated or no organization' }
  }
  
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  
  if (!name) {
    return { error: 'Class name is required' }
  }
  
  const { error } = await supabase
    .from('classes')
    .update({
      name,
      description: description || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', classId)
    .eq('organization_id', organizationId)
  
  if (error) {
    console.error('Error updating class:', error)
    return { error: error.message }
  }
  
  revalidatePath('/school-admin/classes')
  revalidatePath(`/school-admin/classes/${classId}`)
  return { success: true }
}

export async function deleteClass(classId: string) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) {
    return { error: 'Not authenticated or no organization' }
  }
  
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  // First remove all enrollments
  await supabase
    .from('class_enrollments')
    .delete()
    .eq('class_id', classId)
  
  // Then delete the class
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classId)
    .eq('organization_id', organizationId)
  
  if (error) {
    console.error('Error deleting class:', error)
    return { error: error.message }
  }
  
  revalidatePath('/school-admin/classes')
  return { success: true }
}

export async function toggleClassStatus(classId: string, isActive: boolean) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) {
    return { error: 'Not authenticated or no organization' }
  }
  
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  const { error } = await supabase
    .from('classes')
    .update({ 
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', classId)
    .eq('organization_id', organizationId)
  
  if (error) {
    console.error('Error toggling class status:', error)
    return { error: error.message }
  }
  
  revalidatePath('/school-admin/classes')
  return { success: true }
}

export async function enrollStudent(classId: string, studentId: string) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) {
    return { error: 'Not authenticated or no organization' }
  }
  
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  // Verify the class belongs to this organization
  const { data: classData } = await supabase
    .from('classes')
    .select('id')
    .eq('id', classId)
    .eq('organization_id', organizationId)
    .single()
  
  if (!classData) {
    return { error: 'Class not found' }
  }
  
  // Verify the student belongs to this organization
  const { data: studentData } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', studentId)
    .eq('organization_id', organizationId)
    .eq('profile_type', 'student')
    .single()
  
  if (!studentData) {
    return { error: 'Student not found' }
  }
  
  // Check if already enrolled
  const { data: existing } = await supabase
    .from('class_enrollments')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .single()
  
  if (existing) {
    return { error: 'Student is already enrolled in this class' }
  }
  
  const { error } = await supabase
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

export async function unenrollStudent(classId: string, studentId: string) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) {
    return { error: 'Not authenticated or no organization' }
  }
  
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  const { error } = await supabase
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

export async function assignTeacher(classId: string, teacherId: string | null) {
  const organizationId = await getCurrentOrganizationId()
  if (!organizationId) {
    return { error: 'Not authenticated or no organization' }
  }
  
  // Use admin client to bypass RLS
  const supabase = createAdminClient()
  
  // Verify teacher belongs to organization if provided
  if (teacherId) {
    const { data: teacherData } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', teacherId)
      .eq('organization_id', organizationId)
      .eq('profile_type', 'teacher')
      .single()
    
    if (!teacherData) {
      return { error: 'Teacher not found' }
    }
  }
  
  const { error } = await supabase
    .from('classes')
    .update({ 
      teacher_id: teacherId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', classId)
    .eq('organization_id', organizationId)
  
  if (error) {
    console.error('Error assigning teacher:', error)
    return { error: error.message }
  }
  
  revalidatePath('/school-admin/classes')
  revalidatePath(`/school-admin/classes/${classId}`)
  return { success: true }
}
