'use server'

import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { revalidatePath } from 'next/cache'

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

export async function enrollStudent(classId: string, studentId: string) {
  const teacherData = await getTeacherId()
  if (!teacherData) {
    return { error: 'Not authenticated or no organization' }
  }
  
  const { teacherId, organizationId } = teacherData
  const adminClient = createAdminClient()
  
  // Verify class belongs to organization and teacher has access
  const { data: classData } = await adminClient
    .from('classes')
    .select('id, teacher_id')
    .eq('id', classId)
    .eq('organization_id', organizationId)
    .single()
  
  if (!classData) {
    return { error: 'Class not found' }
  }
  
  // Check if teacher is primary or assigned
  const isPrimary = classData.teacher_id === teacherId
  if (!isPrimary) {
    const { data: assignment } = await adminClient
      .from('class_teachers')
      .select('id')
      .eq('class_id', classId)
      .eq('teacher_id', teacherId)
      .single()
    
    if (!assignment) {
      return { error: 'Access denied' }
    }
  }
  
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
  
  revalidatePath(`/teacher/classes/${classId}`)
  return { success: true }
}

export async function shareExamsWithClass(examIds: string[], classId: string) {
  const teacherData = await getTeacherId()
  if (!teacherData) {
    return { error: 'Not authenticated or no organization' }
  }
  
  const { teacherId } = teacherData
  const adminClient = createAdminClient()
  
  // Only in-app exams can be shared with class (exclude course-generated)
  const { error } = await adminClient
    .from('exams')
    .update({ class_id: classId })
    .in('id', examIds)
    .eq('created_by', teacherId)
    .or('course_generated.eq.0,course_generated.is.null')
  
  if (error) {
    console.error('Error sharing exams:', error)
    return { error: error.message }
  }
  
  revalidatePath(`/teacher/classes/${classId}`)
  return { count: examIds.length }
}

export async function shareDocumentsWithClass(documentIds: string[], classId: string) {
  const teacherData = await getTeacherId()
  if (!teacherData) {
    return { error: 'Not authenticated or no organization' }
  }
  
  const { teacherId } = teacherData
  const adminClient = createAdminClient()
  
  // Update documents to set class_id
  const { error } = await adminClient
    .from('documents')
    .update({ class_id: classId })
    .in('id', documentIds)
    .eq('created_by', teacherId)
  
  if (error) {
    console.error('Error sharing documents:', error)
    return { error: error.message }
  }
  
  revalidatePath(`/teacher/classes/${classId}`)
  return { count: documentIds.length }
}

export async function shareLessonsWithClass(lessonIds: string[], classId: string) {
  const teacherData = await getTeacherId()
  if (!teacherData) {
    return { error: 'Not authenticated or no organization' }
  }
  
  const { teacherId } = teacherData
  const adminClient = createAdminClient()
  
  // Only in-app lessons can be shared with class (exclude course-generated)
  const { error } = await adminClient
    .from('lessons')
    .update({ class_id: classId })
    .in('id', lessonIds)
    .eq('created_by', teacherId)
    .or('course_generated.eq.0,course_generated.is.null')
  
  if (error) {
    console.error('Error sharing lessons:', error)
    return { error: error.message }
  }
  
  revalidatePath(`/teacher/classes/${classId}`)
  return { count: lessonIds.length }
}

export async function removeExamFromClass(examId: string, classId: string) {
  const teacherData = await getTeacherId()
  if (!teacherData) {
    return { error: 'Not authenticated or no organization' }
  }
  
  const { teacherId } = teacherData
  const adminClient = createAdminClient()
  
  // Remove class_id from exam
  const { error } = await adminClient
    .from('exams')
    .update({ class_id: null })
    .eq('id', examId)
    .eq('class_id', classId)
    .eq('created_by', teacherId)
  
  if (error) {
    console.error('Error removing exam:', error)
    return { error: error.message }
  }
  
  revalidatePath(`/teacher/classes/${classId}`)
  return { success: true }
}

export async function removeDocumentFromClass(documentId: string, classId: string) {
  const teacherData = await getTeacherId()
  if (!teacherData) {
    return { error: 'Not authenticated or no organization' }
  }
  
  const { teacherId } = teacherData
  const adminClient = createAdminClient()
  
  // Remove class_id from document
  const { error } = await adminClient
    .from('documents')
    .update({ class_id: null })
    .eq('id', documentId)
    .eq('class_id', classId)
    .eq('created_by', teacherId)
  
  if (error) {
    console.error('Error removing document:', error)
    return { error: error.message }
  }
  
  revalidatePath(`/teacher/classes/${classId}`)
  return { success: true }
}

export async function removeLessonFromClass(lessonId: string, classId: string) {
  const teacherData = await getTeacherId()
  if (!teacherData) {
    return { error: 'Not authenticated or no organization' }
  }
  
  const { teacherId } = teacherData
  const adminClient = createAdminClient()
  
  // Remove class_id from lesson
  const { error } = await adminClient
    .from('lessons')
    .update({ class_id: null })
    .eq('id', lessonId)
    .eq('class_id', classId)
    .eq('created_by', teacherId)
  
  if (error) {
    console.error('Error removing lesson:', error)
    return { error: error.message }
  }
  
  revalidatePath(`/teacher/classes/${classId}`)
  return { success: true }
}
