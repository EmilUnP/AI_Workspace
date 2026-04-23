/**
 * Shared utilities for student class detail functionality
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { StudentClassDetailData, SharedExam, SharedDocument, SharedLesson } from '@eduator/ui'
import { createAdminClient } from '@eduator/auth/supabase/admin'

/**
 * Get class details for a student
 */
export async function getClassDetails(
  supabase: SupabaseClient,
  classId: string,
  studentId: string,
  organizationId?: string | null
): Promise<StudentClassDetailData | null> {
  // Verify student is enrolled in this class
  const { data: enrollment } = await supabase
    .from('class_enrollments')
    .select('id')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .eq('status', 'active')
    .single()
  
  if (!enrollment) {
    return null // Student is not enrolled
  }
  
  // Get class data
  const baseQuery = supabase
    .from('classes')
    .select(`
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
    `)
    .eq('id', classId)
  
  const finalQuery = organizationId 
    ? baseQuery.eq('organization_id', organizationId)
    : baseQuery
  
  const { data: classData, error } = await finalQuery.single()
  
  if (error || !classData) {
    console.error('Error fetching class:', error)
    return null
  }
  
  // Get student count
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('id')
    .eq('class_id', classId)
    .eq('status', 'active')
  
  const teacher = Array.isArray(classData.teacher) 
    ? classData.teacher[0] 
    : classData.teacher || null
  
  return {
    id: classData.id,
    name: classData.name,
    description: classData.description,
    class_code: classData.class_code,
    subject: classData.subject,
    grade_level: classData.grade_level,
    created_at: classData.created_at,
    teacher,
    student_count: enrollments?.length || 0,
  }
}

/**
 * Get shared exams for a class
 * Uses admin client to bypass RLS since we've already verified student enrollment
 */
export async function getSharedExams(
  supabase: SupabaseClient,
  classId: string,
  studentId: string,
  organizationId?: string | null
): Promise<SharedExam[]> {
  // Use admin client to bypass RLS (we've already verified enrollment)
  const adminSupabase = createAdminClient()
  
  const baseQuery = adminSupabase
    .from('exams')
    .select(`
      id,
      title,
      description,
      duration_minutes,
      is_published,
      created_at,
      questions,
      created_by,
      creator:profiles!created_by(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('class_id', classId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
  
  const examQuery = organizationId 
    ? baseQuery.eq('organization_id', organizationId)
    : baseQuery
  
  const { data: exams, error } = await examQuery
  
  if (error) {
    console.error('Error fetching shared exams:', {
      error,
      classId,
      organizationId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    return []
  }
  
  console.log(`Exam query result:`, {
    examsCount: exams?.length || 0,
    exams: exams?.map((e: any) => ({ id: e.id, title: e.title, is_published: e.is_published })) || []
  })
  
  if (!exams || exams.length === 0) {
    console.log(`No exams found for class ${classId} (organizationId: ${organizationId || 'null'})`)
    return []
  }
  
  console.log(`Found ${exams.length} exams for class ${classId}`)
  
  // Get exam submissions to check completion status (use regular client for student's own submissions)
  const examIds = exams.map(e => e.id)
  const { data: submissions } = await supabase
    .from('exam_submissions')
    .select('exam_id, score')
    .eq('student_id', studentId)
    .in('exam_id', examIds)
  
  const submissionsMap = new Map<string, { score: number }>()
  submissions?.forEach(sub => {
    submissionsMap.set(sub.exam_id, { score: sub.score })
  })
  
  return exams.map((exam: any) => {
    const submission = submissionsMap.get(exam.id)
    const questionCount = Array.isArray(exam.questions) ? exam.questions.length : 0
    const creator = Array.isArray(exam.creator) 
      ? exam.creator[0] 
      : exam.creator || null
    
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      duration_minutes: exam.duration_minutes,
      is_published: exam.is_published,
      created_at: exam.created_at,
      question_count: questionCount,
      has_submitted: !!submission,
      submission_score: submission?.score || null,
      created_by: exam.created_by,
      creator: creator ? {
        id: creator.id,
        full_name: creator.full_name,
        avatar_url: creator.avatar_url
      } : null,
    }
  })
}

/**
 * Get shared documents for a class
 * Uses admin client to bypass RLS since we've already verified student enrollment
 */
export async function getSharedDocuments(
  _supabase: SupabaseClient,
  classId: string,
  organizationId?: string | null
): Promise<SharedDocument[]> {
  // Use admin client to bypass RLS (we've already verified enrollment)
  const adminSupabase = createAdminClient()
  
  const baseQuery = adminSupabase
    .from('documents')
    .select(`
      id,
      title,
      description,
      file_type,
      file_size,
      file_url,
      created_at,
      created_by,
      creator:profiles!created_by(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('class_id', classId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
  
  const docQuery = organizationId 
    ? baseQuery.eq('organization_id', organizationId)
    : baseQuery
  
  const { data: documents, error } = await docQuery
  
  if (error) {
    console.error('Error fetching shared documents:', {
      error,
      classId,
      organizationId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    return []
  }
  
  console.log(`Document query result:`, {
    documentsCount: documents?.length || 0,
    documents: documents?.map((d: any) => ({ id: d.id, title: d.title })) || []
  })
  
  if (!documents) {
    console.log(`No documents found for class ${classId} (organizationId: ${organizationId || 'null'})`)
    return []
  }
  
  console.log(`Found ${documents.length} documents for class ${classId}`)
  
  // Format documents with creator information
  return documents.map((doc: any) => {
    const creator = Array.isArray(doc.creator) 
      ? doc.creator[0] 
      : doc.creator || null
    
    return {
      id: doc.id,
      title: doc.title,
      description: doc.description,
      file_type: doc.file_type,
      file_size: doc.file_size,
      file_url: doc.file_url,
      created_at: doc.created_at,
      created_by: doc.created_by,
      creator: creator ? {
        id: creator.id,
        full_name: creator.full_name,
        avatar_url: creator.avatar_url
      } : null,
    }
  })
}

/**
 * Get all teachers for a class (main teacher + additional teachers from class_teachers)
 * Uses admin client to bypass RLS since we've already verified student enrollment
 */
export async function getClassTeachers(
  _supabase: SupabaseClient,
  classId: string
): Promise<Array<{
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  role?: string | null
  is_primary?: boolean
}>> {
  const adminSupabase = createAdminClient()
  
  // Get class to check for main teacher
  const { data: classData } = await adminSupabase
    .from('classes')
    .select('teacher_id')
    .eq('id', classId)
    .single()
  
  // Get teachers from class_teachers junction table
  const { data: classTeachers, error } = await adminSupabase
    .from('class_teachers')
    .select('teacher_id, role')
    .eq('class_id', classId)
    .order('assigned_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching class teachers:', error)
  }
  
  // Collect all teacher IDs
  const teacherIds = new Set<string>()
  
  // Add main teacher if exists
  if (classData?.teacher_id) {
    teacherIds.add(classData.teacher_id)
  }
  
  // Add teachers from class_teachers
  classTeachers?.forEach(ct => {
    if (ct.teacher_id) {
      teacherIds.add(ct.teacher_id)
    }
  })
  
  if (teacherIds.size === 0) {
    return []
  }
  
  // Get teacher profiles
  const { data: teachers } = await adminSupabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', Array.from(teacherIds))
  
  if (!teachers) {
    return []
  }
  
  // Create a map of teacher_id -> role from class_teachers
  const roleMap = new Map<string, string>()
  classTeachers?.forEach(ct => {
    if (ct.teacher_id && ct.role) {
      roleMap.set(ct.teacher_id, ct.role)
    }
  })
  
  // Format teachers with role information
  return teachers.map(teacher => ({
    id: teacher.id,
    full_name: teacher.full_name,
    email: teacher.email,
    avatar_url: teacher.avatar_url,
    role: roleMap.get(teacher.id) || (classData?.teacher_id === teacher.id ? 'primary' : null),
    is_primary: classData?.teacher_id === teacher.id || roleMap.get(teacher.id) === 'primary'
  }))
}

/**
 * Get enrolled students for a class
 * Uses admin client to bypass RLS since we've already verified student enrollment
 */
export async function getEnrolledStudents(
  _supabase: SupabaseClient,
  classId: string
): Promise<Array<{
  id: string
  enrolled_at: string
  status: string
  student: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}>> {
  const adminSupabase = createAdminClient()
  
  const { data: enrollments, error } = await adminSupabase
    .from('class_enrollments')
    .select('id, enrolled_at, status, student_id')
    .eq('class_id', classId)
    .eq('status', 'active')
    .order('enrolled_at', { ascending: false })
  
  if (error || !enrollments || enrollments.length === 0) {
    return []
  }
  
  const studentIds = enrollments.map(e => e.student_id)
  const { data: students } = await adminSupabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', studentIds)
  
  const studentsMap: Record<string, any> = {}
  students?.forEach(s => {
    studentsMap[s.id] = s
  })
  
  return enrollments.map(e => ({
    ...e,
    student: studentsMap[e.student_id] || null
  }))
}

/**
 * Get shared lessons for a class
 * Uses admin client to bypass RLS since we've already verified student enrollment
 */
export async function getSharedLessons(
  _supabase: SupabaseClient,
  classId: string,
  organizationId?: string | null
): Promise<SharedLesson[]> {
  // Use admin client to bypass RLS (we've already verified enrollment)
  const adminSupabase = createAdminClient()
  
  const baseQuery = adminSupabase
    .from('lessons')
    .select(`
      id,
      title,
      description,
      topic,
      duration_minutes,
      is_published,
      created_at,
      created_by,
      creator:profiles!created_by(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('class_id', classId)
    .eq('is_archived', false)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
  
  const lessonQuery = organizationId 
    ? baseQuery.eq('organization_id', organizationId)
    : baseQuery
  
  const { data: lessons, error } = await lessonQuery
  
  if (error) {
    console.error('Error fetching shared lessons:', {
      error,
      classId,
      organizationId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    return []
  }
  
  console.log(`Lesson query result:`, {
    lessonsCount: lessons?.length || 0,
    lessons: lessons?.map((l: any) => ({ id: l.id, title: l.title, is_published: l.is_published })) || []
  })
  
  if (!lessons) {
    console.log(`No lessons found for class ${classId} (organizationId: ${organizationId || 'null'})`)
    return []
  }
  
  console.log(`Found ${lessons.length} lessons for class ${classId}`)
  
  // Format lessons with creator information
  return lessons.map((lesson: any) => {
    const creator = Array.isArray(lesson.creator) 
      ? lesson.creator[0] 
      : lesson.creator || null
    
    return {
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      topic: lesson.topic,
      duration_minutes: lesson.duration_minutes,
      is_published: lesson.is_published,
      created_at: lesson.created_at,
      created_by: lesson.created_by,
      creator: creator ? {
        id: creator.id,
        full_name: creator.full_name,
        avatar_url: creator.avatar_url
      } : null,
    }
  })
}
