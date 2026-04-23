/**
 * Shared utilities for student exam detail/taking functionality
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { selectFinalExamQuestionIds } from './final-exam-question-selection'

export interface StudentExamDetailData {
  id: string
  title: string
  description?: string | null
  duration_minutes?: number | null
  created_at: string
  start_time?: string | null
  end_time?: string | null
  is_published: boolean
  class_id?: string | null
  class_name?: string | null
  language?: string | null
  translations?: Record<string, Array<{
    id: string
    type: 'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank'
    question: string
    question_html?: string
    options?: string[]
    hint?: string
    explanation?: string
    image_url?: string
    audio_url?: string
    order?: number
  }>>
  questions: Array<{
    id: string
    type: 'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank'
    question: string
    question_html?: string
    options?: string[]
    hint?: string
    explanation?: string
    image_url?: string
    audio_url?: string
    order?: number
  }>
  has_submitted?: boolean
  submission_score?: number | null
  attempt_count?: number
  best_score?: number | null
  average_score?: number | null
}

/**
 * Get exam details for a student to take
 * Uses admin client to bypass RLS and excludes correct answers
 */
export async function getStudentExamDetail(
  supabase: SupabaseClient,
  examId: string,
  studentId: string,
  organizationId?: string | null,
  finalExamId?: string | null
): Promise<StudentExamDetailData | null> {
  // Use admin client to bypass RLS for all queries
  const adminSupabase = createAdminClient()

  // First verify student enrollment using admin client
  const { data: exam, error: examError } = await adminSupabase
    .from('exams')
    .select('class_id, organization_id')
    .eq('id', examId)
    .maybeSingle()

  if (examError) {
    console.error('Error fetching exam for enrollment check:', examError)
    return null
  }

  if (!exam) {
    console.error('Exam not found:', examId)
    return null
  }

  // Verify organization matches (for ERP)
  if (organizationId && exam.organization_id !== organizationId) {
    console.error('Exam organization mismatch:', { examId, expectedOrg: organizationId, actualOrg: exam.organization_id })
    return null
  }

  let hasAccess = false

  if (exam.class_id) {
    // Class-based exam: student must be enrolled in the class
    const { data: enrollment, error: enrollmentError } = await adminSupabase
      .from('class_enrollments')
      .select('id')
      .eq('class_id', exam.class_id)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .maybeSingle()

    if (enrollmentError) {
      console.error('Error checking enrollment:', enrollmentError)
      return null
    }
    if (!enrollment) {
      console.error('Student not enrolled in exam class:', { examId, studentId, classId: exam.class_id })
      return null
    }
    hasAccess = true
  } else {
    // Scheduled final exam flow: exam can be class-less source exam, access comes from final_exams.class_id.
    if (finalExamId) {
      const { data: finalExam, error: finalExamError } = await adminSupabase
        .from('final_exams')
        .select('id, source_exam_id, class_id')
        .eq('id', finalExamId)
        .maybeSingle()

      if (finalExamError) {
        console.error('Error loading final exam for access check:', finalExamError)
        return null
      }

      const finalExamRow = finalExam as { id: string; source_exam_id?: string | null; class_id?: string | null } | null
      if (finalExamRow && finalExamRow.source_exam_id === examId && finalExamRow.class_id) {
        const { data: finalEnrollment, error: finalEnrollmentError } = await adminSupabase
          .from('class_enrollments')
          .select('id')
          .eq('class_id', finalExamRow.class_id)
          .eq('student_id', studentId)
          .eq('status', 'active')
          .maybeSingle()

        if (finalEnrollmentError) {
          console.error('Error checking final exam class enrollment:', finalEnrollmentError)
          return null
        }
        if (finalEnrollment) {
          hasAccess = true
        }
      }
    }

    if (hasAccess) {
      // Access confirmed through final_exams.class_id
    } else {
    // Course final exam (no class_id): student must be enrolled in a course that has this exam as final_exam_id
    const { data: coursesWithExam } = await adminSupabase
      .from('courses')
      .select('id, metadata')
      .eq('is_archived', false)
      .not('metadata', 'is', null)

    const courseIds = (coursesWithExam ?? []).filter((c: { id: string; metadata?: unknown }) => {
      const meta = c.metadata as { final_exam_id?: string } | null | undefined
      return meta?.final_exam_id === examId
    }).map((c: { id: string }) => c.id)

    if (courseIds.length === 0) {
      console.error('Exam has no class_id and is not a course final exam:', { examId })
      return null
    }

    const { data: enrollment, error: enrollmentError } = await adminSupabase
      .from('course_enrollments')
      .select('id')
      .in('course_id', courseIds)
      .eq('student_id', studentId)
      .limit(1)
      .maybeSingle()

    if (enrollmentError) {
      console.error('Error checking course enrollment:', enrollmentError)
      return null
    }
    if (!enrollment) {
      console.error('Student not enrolled in a course that has this final exam:', { examId, studentId })
      return null
    }
    hasAccess = true
    }
  }

  if (!hasAccess) return null

  const baseQuery = adminSupabase
    .from('exams')
    .select(`
      id,
      title,
      description,
      duration_minutes,
      created_at,
      start_time,
      end_time,
      is_published,
      class_id,
      language,
      translations,
      questions,
      classes(name)
    `)
    .eq('id', examId)
    .eq('is_archived', false)

  const examQuery = organizationId 
    ? baseQuery.eq('organization_id', organizationId)
    : baseQuery

  const { data: examData, error } = await examQuery.single()

  if (error) {
    console.error('Error fetching exam detail:', {
      error,
      examId,
      organizationId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    return null
  }

  if (!examData) {
    console.error('Exam data is null:', examId)
    return null
  }

  // Get all submissions for this exam+student (for attempt stats and "has submitted")
  const { data: submissions } = await supabase
    .from('exam_submissions')
    .select('score')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .not('score', 'is', null)
  const scores = (submissions || []).map((s: { score: number | null }) => s.score).filter((v): v is number => v != null && !Number.isNaN(v))
  const attempt_count = scores.length
  const best_score = scores.length > 0 ? Math.max(...scores) : null
  const average_score = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const has_submitted = attempt_count > 0

  const classData: any = examData.classes
  const className = Array.isArray(classData) 
    ? (classData[0] as any)?.name 
    : (classData as any)?.name || null

  let selectedQuestionIdsForFinal: string[] | null = null
  let finalQuestionMode: 'fixed_selection' | 'random_pool' = 'fixed_selection'
  let questionsPerAttempt: number | null = null
  if (finalExamId) {
    const { data: finalExam } = await adminSupabase
      .from('final_exams')
      .select('id, source_exam_id, selected_question_ids, source_entries, question_mode, questions_per_attempt')
      .eq('id', finalExamId)
      .maybeSingle()

    if (finalExam) {
      const row = finalExam as {
        source_exam_id?: string
        selected_question_ids?: string[] | null
        source_entries?: Array<{ exam_id?: string; selected_question_ids?: string[] | null }> | null
        question_mode?: 'fixed_selection' | 'random_pool' | null
        questions_per_attempt?: number | null
      }
      const entry = Array.isArray(row.source_entries)
        ? row.source_entries.find((e) => e?.exam_id === examId)
        : null
      selectedQuestionIdsForFinal =
        (entry?.selected_question_ids ?? row.selected_question_ids ?? null)?.filter(Boolean) ?? null
      finalQuestionMode = row.question_mode === 'random_pool' ? 'random_pool' : 'fixed_selection'
      questionsPerAttempt = row.questions_per_attempt ?? null
    }
  }

  // Normalize one question object (primary or translated) to a consistent shape
  const normalizeQuestion = (q: any) => ({
    id: q.id || `q-${Math.random()}`,
    type: q.type || 'multiple_choice',
    question: q.question || q.text || '',
    question_html: q.question_html,
    options: q.options || [],
    hint: q.hint,
    explanation: typeof q.explanation === 'string' ? q.explanation : undefined,
    image_url: q.image_url,
    audio_url: q.audio_url,
    order: q.order ?? 0,
  })

  // Format questions - remove correct answers only; keep explanations for learning
  const fullQuestions = Array.isArray(examData.questions)
    ? examData.questions.map(normalizeQuestion)
    : []
  const effectiveQuestionIds = finalExamId
    ? selectFinalExamQuestionIds({
        examQuestionIds: fullQuestions.map((q) => q.id),
        selectedQuestionIds: selectedQuestionIdsForFinal,
        mode: finalQuestionMode,
        questionsPerAttempt,
        studentId,
        finalExamId,
      })
    : fullQuestions.map((q) => q.id)
  const effectiveQuestionIdSet = new Set(effectiveQuestionIds)
  const questions = fullQuestions.filter((q) => effectiveQuestionIdSet.has(q.id))

  // Get language and translations from exam data; normalize each language's questions to same shape
  const examDataTyped = examData as any
  const examLanguage = examDataTyped.language || null
  const rawTranslations = examDataTyped.translations || null
  const translations: Record<string, ReturnType<typeof normalizeQuestion>[]> = {}
  if (rawTranslations && typeof rawTranslations === 'object' && !Array.isArray(rawTranslations)) {
    Object.keys(rawTranslations).forEach((lang) => {
      const arr = rawTranslations[lang]
      const normalized = Array.isArray(arr) ? arr.map(normalizeQuestion) : []
      translations[lang] = normalized.filter((q) => effectiveQuestionIdSet.has(q.id))
    })
  }

  return {
    id: examData.id,
    title: examData.title,
    description: examData.description,
    duration_minutes: examData.duration_minutes,
    created_at: examData.created_at,
    start_time: examData.start_time,
    end_time: examData.end_time,
    is_published: examData.is_published,
    class_id: examData.class_id,
    class_name: className,
    language: examLanguage,
    translations,
    questions,
    has_submitted,
    submission_score: best_score,
    attempt_count,
    best_score,
    average_score,
  }
}
