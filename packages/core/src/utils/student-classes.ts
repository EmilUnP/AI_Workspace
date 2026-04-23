/**
 * Shared utilities for student classes functionality
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { StudentClassItem } from '@eduator/ui'

/**
 * Get enrolled classes for a student
 */
export async function getEnrolledClasses(
  supabase: SupabaseClient,
  studentId: string
): Promise<StudentClassItem[]> {
  // Get enrolled classes
  const { data: enrollments, error } = await supabase
    .from('class_enrollments')
    .select(`
      class:classes(
        id,
        name,
        description,
        class_code,
        subject,
        grade_level,
        created_at,
        teacher:profiles!teacher_id(
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .eq('student_id', studentId)
    .eq('status', 'active')
  
  if (error) {
    console.error('Error fetching enrolled classes:', error)
    return []
  }
  
  if (!enrollments || enrollments.length === 0) {
    return []
  }
  
  // Get class IDs to fetch student counts
  const classIds = enrollments
    .map((e: any) => e.class?.id)
    .filter(Boolean)
  
  // Get student counts for each class
  const { data: studentCounts } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .in('class_id', classIds)
    .eq('status', 'active')
  
  // Count students per class
  const countsMap = new Map<string, number>()
  studentCounts?.forEach(enrollment => {
    const count = countsMap.get(enrollment.class_id) || 0
    countsMap.set(enrollment.class_id, count + 1)
  })
  
  // Format classes for display
  return enrollments
    .map((enrollment: any) => {
      const classData = enrollment.class
      if (!classData) return null
      
      return {
        id: classData.id,
        name: classData.name,
        description: classData.description,
        class_code: classData.class_code,
        subject: classData.subject,
        grade_level: classData.grade_level,
        created_at: classData.created_at,
        teacher: Array.isArray(classData.teacher) 
          ? classData.teacher[0] 
          : classData.teacher || null,
        student_count: countsMap.get(classData.id) || 0,
      }
    })
    .filter(Boolean) as StudentClassItem[]
}

/**
 * Get pending class enrollments for a student (join requested, awaiting teacher confirmation).
 * Used in ERP when students join by code and must wait for teacher to confirm.
 */
export async function getPendingClasses(
  supabase: SupabaseClient,
  studentId: string
): Promise<StudentClassItem[]> {
  const { data: enrollments, error } = await supabase
    .from('class_enrollments')
    .select(`
      class:classes(
        id,
        name,
        description,
        class_code,
        subject,
        grade_level,
        created_at,
        teacher:profiles!teacher_id(
          id,
          full_name,
          avatar_url
        )
      )
    `)
    .eq('student_id', studentId)
    .eq('status', 'pending')

  if (error) {
    console.error('Error fetching pending classes:', error)
    return []
  }

  if (!enrollments || enrollments.length === 0) {
    return []
  }

  return enrollments
    .map((enrollment: any) => {
      const classData = enrollment.class
      if (!classData) return null
      return {
        id: classData.id,
        name: classData.name,
        description: classData.description,
        class_code: classData.class_code,
        subject: classData.subject,
        grade_level: classData.grade_level,
        created_at: classData.created_at,
        teacher: Array.isArray(classData.teacher)
          ? classData.teacher[0]
          : classData.teacher || null,
        student_count: 0,
      }
    })
    .filter(Boolean) as StudentClassItem[]
}
