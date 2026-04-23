'use server'

import { createAdminClient } from '@eduator/auth/supabase/admin'

interface GetUsersByUnitParams {
  organizationId: string
  profileType: 'teacher' | 'student'
  classId: string
  unitId?: string | null
}

export async function getUsersByUnit({ 
  organizationId, 
  profileType, 
  classId, 
  unitId 
}: GetUsersByUnitParams) {
  const adminClient = createAdminClient()

  // Get already assigned users
  if (profileType === 'teacher') {
    const { data: classTeachers } = await adminClient
      .from('class_teachers')
      .select('teacher_id')
      .eq('class_id', classId)
    
    const { data: classData } = await adminClient
      .from('classes')
      .select('teacher_id')
      .eq('id', classId)
      .single()
    
    const assignedIds = new Set<string>()
    if (classData?.teacher_id) {
      assignedIds.add(classData.teacher_id)
    }
    classTeachers?.forEach(ct => {
      if (ct.teacher_id) assignedIds.add(ct.teacher_id)
    })

    // Get all teachers first
    const { data: allTeachers } = await adminClient
      .from('profiles')
      .select('id, full_name, email, metadata')
      .eq('organization_id', organizationId)
      .eq('profile_type', 'teacher')
      .eq('approval_status', 'approved')
      .order('full_name')

    if (!allTeachers || allTeachers.length === 0) {
      return []
    }

    // Filter by unit if provided
    let filtered = allTeachers
    if (unitId && unitId.trim() !== '') {
      // Filter in memory since JSONB filtering is complex
      filtered = allTeachers.filter(teacher => {
        const metadata = teacher.metadata as { organization_unit_id?: string } | null
        return metadata?.organization_unit_id === unitId
      })
    }
    
    // Exclude already assigned
    return filtered.filter(t => !assignedIds.has(t.id))
  } else {
    // Students
    const { data: enrollments } = await adminClient
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
    
    const enrolledIds = enrollments?.map(e => e.student_id) || []

    // Get all students first
    const { data: allStudents } = await adminClient
      .from('profiles')
      .select('id, full_name, email, metadata')
      .eq('organization_id', organizationId)
      .eq('profile_type', 'student')
      .eq('approval_status', 'approved')
      .order('full_name')

    if (!allStudents || allStudents.length === 0) {
      return []
    }

    // Filter by unit if provided
    let filtered = allStudents
    if (unitId && unitId.trim() !== '') {
      // Filter in memory since JSONB filtering is complex
      filtered = allStudents.filter(student => {
        const metadata = student.metadata as { organization_unit_id?: string } | null
        return metadata?.organization_unit_id === unitId
      })
    }
    
    // Exclude already enrolled
    return filtered.filter(s => !enrolledIds.includes(s.id))
  }
}
