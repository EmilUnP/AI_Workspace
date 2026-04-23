import { getDbClient } from '../client'
import type { Class, ClassWithStats } from '@eduator/core/types/exam'

/**
 * Class Repository - Data access layer for classes
 */
export const classRepository = {
  /**
   * Get class by ID
   */
  async getById(id: string): Promise<Class | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error getting class:', error)
      return null
    }

    return data as Class
  },

  /**
   * Get class by code
   */
  async getByCode(code: string): Promise<Class | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('class_code', code)
      .single()

    if (error) {
      console.error('Error getting class by code:', error)
      return null
    }

    return data as Class
  },

  /**
   * Get class with stats
   */
  async getByIdWithStats(id: string): Promise<ClassWithStats | null> {
    const supabase = getDbClient()

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .single()

    if (classError || !classData) {
      console.error('Error getting class:', classError)
      return null
    }

    const { data: classExamRows } = await supabase
      .from('exams')
      .select('id')
      .eq('class_id', id)
      .eq('is_archived', false)
      .or('course_generated.eq.0,course_generated.is.null')

    const classExamIds = classExamRows?.map((e) => e.id) || []

    const [enrollmentCount, examCount, submissionsData] = await Promise.all([
      supabase
        .from('class_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', id)
        .eq('status', 'active'),
      Promise.resolve({ count: classExamIds.length }),
      classExamIds.length > 0
        ? supabase
            .from('exam_submissions')
            .select('score')
            .eq('status', 'graded')
            .in('exam_id', classExamIds)
        : Promise.resolve({ data: [] as { score: number }[] }),
    ])

    const scores = submissionsData.data?.map((s) => s.score).filter(Boolean) || []
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0

    return {
      ...classData,
      stats: {
        total_students: enrollmentCount.count || 0,
        total_exams: examCount.count || 0,
        average_score: averageScore,
        completion_rate: 0, // TODO: Calculate
      },
    } as ClassWithStats
  },

  /**
   * Get classes by teacher. Optional limit to cap result size (e.g. limit: 200).
   */
  async getByTeacher(teacherId: string, options?: { isActive?: boolean; limit?: number }) {
    const supabase = getDbClient()

    const classListColumns = 'id, organization_id, teacher_id, name, description, subject, grade_level, academic_year, semester, class_code, is_active, settings, created_at, updated_at'
    let query = supabase
      .from('classes')
      .select(classListColumns)
      .eq('teacher_id', teacherId)

    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive)
    }

    if (options?.limit != null && options.limit > 0) {
      query = query.limit(Math.min(options.limit, 2000))
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting teacher classes:', error)
      return []
    }

    return data as Class[]
  },

  /**
   * Get classes by organization
   */
  async getByOrganization(
    organizationId: string,
    options?: { page?: number; perPage?: number; isActive?: boolean }
  ) {
    const supabase = getDbClient()
    const { page = 1, perPage = 20, isActive } = options || {}

    let query = supabase
      .from('classes')
      .select('*, teacher:profiles!teacher_id(id, full_name)', { count: 'exact' })
      .eq('organization_id', organizationId)

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1)

    if (error) {
      console.error('Error getting organization classes:', error)
      return { data: [], count: 0 }
    }

    return { data, count: count || 0 }
  },

  /**
   * Get classes for a student
   */
  async getForStudent(studentId: string) {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('class_enrollments')
      .select(`
        class:classes(
          *,
          teacher:profiles!teacher_id(id, full_name, avatar_url)
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'active')

    if (error) {
      console.error('Error getting student classes:', error)
      return []
    }

    return data.map((e) => e.class).filter(Boolean)
  },

  /**
   * Create a new class
   */
  async create(
    organizationId: string,
    teacherId: string,
    input: {
      name: string
      description?: string
      subject?: string
      grade_level?: string
      academic_year?: string
      semester?: string
    }
  ): Promise<Class | null> {
    const supabase = getDbClient()

    // Generate unique class code
    const classCode = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    const { data, error } = await supabase
      .from('classes')
      .insert({
        organization_id: organizationId,
        teacher_id: teacherId,
        ...input,
        class_code: classCode,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating class:', error)
      return null
    }

    return data as Class
  },

  /**
   * Update a class
   */
  async update(
    id: string,
    input: Partial<{
      name: string
      description: string
      subject: string
      grade_level: string
      academic_year: string
      semester: string
      is_active: boolean
    }>
  ): Promise<Class | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('classes')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating class:', error)
      return null
    }

    return data as Class
  },

  /**
   * Delete a class
   */
  async delete(id: string): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase.from('classes').delete().eq('id', id)

    if (error) {
      console.error('Error deleting class:', error)
      return false
    }

    return true
  },

  /**
   * Enroll student in class
   */
  async enrollStudent(classId: string, studentId: string): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase.from('class_enrollments').insert({
      class_id: classId,
      student_id: studentId,
      status: 'active',
    })

    if (error) {
      console.error('Error enrolling student:', error)
      return false
    }

    return true
  },

  /**
   * Unenroll student from class
   */
  async unenrollStudent(classId: string, studentId: string): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase
      .from('class_enrollments')
      .update({ status: 'dropped' })
      .eq('class_id', classId)
      .eq('student_id', studentId)

    if (error) {
      console.error('Error unenrolling student:', error)
      return false
    }

    return true
  },

  /**
   * Get students in a class
   */
  async getStudents(classId: string) {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('class_enrollments')
      .select(`
        enrolled_at,
        status,
        student:profiles!student_id(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('class_id', classId)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: true })

    if (error) {
      console.error('Error getting class students:', error)
      return []
    }

    return data
  },

  /**
   * Join class by code
   */
  async joinByCode(code: string, studentId: string): Promise<{ success: boolean; error?: string }> {
    const classData = await this.getByCode(code)

    if (!classData) {
      return { success: false, error: 'Class not found' }
    }

    if (!classData.is_active) {
      return { success: false, error: 'Class is not active' }
    }

    const enrolled = await this.enrollStudent(classData.id, studentId)

    if (!enrolled) {
      return { success: false, error: 'Failed to enroll in class' }
    }

    return { success: true }
  },
}
