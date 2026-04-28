import { getDbClient } from '../client'
import type {
  Exam,
  CreateExamInput,
  UpdateExamInput,
  Question,
  ExamSubmission,
  StudentAnswer,
} from '@eduator/core/types/exam'

/**
 * Exam Repository - Data access layer for exams
 */
export const examRepository = {
  /**
   * Get exam by ID
   */
  async getById(id: string): Promise<Exam | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error getting exam:', error)
      return null
    }

    return data as Exam
  },

  /**
   * Get exam with questions
   */
  async getByIdWithQuestions(id: string): Promise<Exam | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('exams')
      .select(`
        *,
        questions:exam_questions(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error getting exam with questions:', error)
      return null
    }

    return data as Exam
  },

  /**
   * Get exams by teacher
   */
  async getByTeacher(
    teacherId: string,
    options?: {
      page?: number
      perPage?: number
      isPublished?: boolean
      classId?: string
    }
  ) {
    const supabase = getDbClient()
    const { page = 1, perPage = 20, isPublished, classId } = options || {}

    const examListColumns = 'id, class_id, created_by, title, description, subject, grade_level, settings, duration_minutes, is_published, is_archived, start_time, end_time, course_generated, metadata, created_at, updated_at'
    let query = supabase
      .from('exams')
      .select(examListColumns, { count: 'exact' })
      .eq('created_by', teacherId)
      .eq('is_archived', false)
      .or('course_generated.eq.0,course_generated.is.null')

    if (isPublished !== undefined) {
      query = query.eq('is_published', isPublished)
    }

    if (classId) {
      query = query.eq('class_id', classId)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1)

    if (error) {
      console.error('Error getting teacher exams:', error)
      return { data: [], count: 0 }
    }

    return { data: data as Exam[], count: count || 0 }
  },

  /**
   * Get exams by organization
   */
  async getByOrganization(
    organizationId: string,
    options?: {
      page?: number
      perPage?: number
      isPublished?: boolean
    }
  ) {
    const supabase = getDbClient()
    const { page = 1, perPage = 20, isPublished } = options || {}
    void organizationId

    let query = supabase
      .from('exams')
      .select('*, created_by_profile:profiles!created_by(full_name)', { count: 'exact' })
      .neq('id', '')
      .eq('is_archived', false)
      .or('course_generated.eq.0,course_generated.is.null')

    if (isPublished !== undefined) {
      query = query.eq('is_published', isPublished)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1)

    if (error) {
      console.error('Error getting exams:', error)
      return { data: [], count: 0 }
    }

    return { data, count: count || 0 }
  },

  /**
   * Get available exams for learner
   */
  async getAvailableForLearner(_learnerId: string, classIds: string[]) {
    const supabase = getDbClient()

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .in('class_id', classIds)
      .eq('is_published', true)
      .eq('is_archived', false)
      .or('course_generated.eq.0,course_generated.is.null')
      .or(`start_time.is.null,start_time.lte.${now}`)
      .or(`end_time.is.null,end_time.gte.${now}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error getting available exams:', error)
      return []
    }

    return data as Exam[]
  },

  /**
   * Create a new exam
   */
  async create(
    organizationId: string,
    createdBy: string,
    input: CreateExamInput
  ): Promise<Exam | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('exams')
      .insert({
        organization_id: organizationId,
        created_by: createdBy,
        ...input,
        course_generated: input.course_generated ?? 0,
        questions: [],
        is_published: false,
        is_archived: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating exam:', error)
      return null
    }

    return data as Exam
  },

  /**
   * Update an exam
   */
  async update(id: string, input: UpdateExamInput): Promise<Exam | null> {
    const supabase = getDbClient()

    const updateData: Record<string, unknown> = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('exams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating exam:', error)
      return null
    }

    return data as Exam
  },

  /**
   * Update exam questions
   */
  async updateQuestions(id: string, questions: Question[]): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase
      .from('exams')
      .update({
        questions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating questions:', error)
      return false
    }

    return true
  },

  /**
   * Publish/unpublish exam
   */
  async setPublished(id: string, isPublished: boolean): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase
      .from('exams')
      .update({
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error setting published status:', error)
      return false
    }

    return true
  },

  /**
   * Archive exam
   */
  async archive(id: string): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase
      .from('exams')
      .update({
        is_archived: true,
        is_published: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Error archiving exam:', error)
      return false
    }

    return true
  },

  /**
   * Delete exam
   */
  async delete(id: string): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting exam:', error)
      return false
    }

    return true
  },

  /**
   * Create exam submission
   */
  async createSubmission(
    examId: string,
    learnerId: string,
    attemptNumber: number
  ): Promise<ExamSubmission | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('exam_submissions')
      .insert({
        exam_id: examId,
        student_id: learnerId,
        answers: [],
        started_at: new Date().toISOString(),
        time_spent_seconds: 0,
        attempt_number: attemptNumber,
        status: 'in_progress',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating submission:', error)
      return null
    }

    return data as ExamSubmission
  },

  /**
   * Submit exam answers
   */
  async submitExam(
    submissionId: string,
    answers: StudentAnswer[],
    timeSpent: number
  ): Promise<ExamSubmission | null> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('exam_submissions')
      .update({
        answers,
        submitted_at: new Date().toISOString(),
        time_spent_seconds: timeSpent,
        status: 'submitted',
      })
      .eq('id', submissionId)
      .select()
      .single()

    if (error) {
      console.error('Error submitting exam:', error)
      return null
    }

    return data as ExamSubmission
  },

  /**
   * Get learner submissions for an exam
   */
  async getSubmissions(examId: string) {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('exam_submissions')
      .select(`
        *,
        student:profiles!student_id(id, full_name, email)
      `)
      .eq('exam_id', examId)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error getting submissions:', error)
      return []
    }

    return data
  },

  /**
   * Get learner's submission for an exam
   */
  async getLearnerSubmission(examId: string, learnerId: string) {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('exam_submissions')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', learnerId)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting learner submission:', error)
      return null
    }

    return data as ExamSubmission | null
  },
}
