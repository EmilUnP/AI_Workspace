/**
 * Shared utilities for teacher classes functionality
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface TeacherClassFilterItem {
  id: string
  name: string
}

/**
 * Get teacher's active classes for filter dropdowns (e.g. exam/lesson list class filter)
 */
export async function getTeacherClasses(
  supabase: SupabaseClient,
  teacherId: string
): Promise<TeacherClassFilterItem[]> {
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .eq('teacher_id', teacherId)
    .eq('is_active', true)
    .order('name')
  return classes || []
}

export interface ClassWithEnrollments {
  id: string
  name: string
  description?: string | null
  class_code?: string | null
  subject?: string | null
  grade_level?: string | null
  created_at: string
  student_count: number
}

/**
 * Calculate enrollment counts for classes
 */
export function calculateEnrollmentCounts(
  _classes: ClassWithEnrollments[],
  enrollments: Array<{ class_id: string }>
): Record<string, number> {
  const counts: Record<string, number> = {}
  enrollments?.forEach(e => {
    counts[e.class_id] = (counts[e.class_id] || 0) + 1
  })
  return counts
}

/**
 * Add enrollment counts to classes
 */
export function addEnrollmentCounts<T extends { id: string }>(
  classes: T[],
  enrollmentCounts: Record<string, number>
): Array<T & { student_count: number }> {
  return classes.map(c => ({
    ...c,
    student_count: enrollmentCounts[c.id] || 0
  }))
}
