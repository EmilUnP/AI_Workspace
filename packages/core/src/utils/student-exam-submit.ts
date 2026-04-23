/**
 * Compute exam score from answers (server-side, with correct answers).
 * Used when submitting an exam to store the score.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { selectFinalExamQuestionIds } from './final-exam-question-selection'

/**
 * Compute percentage score (0-100) for a submission.
 * Verifies enrollment, fetches exam questions with correct_answer, then scores.
 * Returns null if exam not found, student not enrolled, or no questions.
 */
export async function computeExamScore(
  _supabase: SupabaseClient,
  examId: string,
  studentId: string,
  organizationId: string | null,
  answers: Record<string, string | string[]>,
  finalExamId?: string | null
): Promise<number | null> {
  const adminSupabase = createAdminClient()

  const { data: exam, error: examError } = await adminSupabase
    .from('exams')
    .select('id, class_id, organization_id, questions')
    .eq('id', examId)
    .eq('is_archived', false)
    .maybeSingle()

  if (examError || !exam) return null
  if (organizationId != null && exam.organization_id !== organizationId) return null

  let hasAccess = false
  if (exam.class_id) {
    const { data: enrollment } = await adminSupabase
      .from('class_enrollments')
      .select('id')
      .eq('class_id', exam.class_id)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .maybeSingle()
    hasAccess = !!enrollment
  } else {
    // Scheduled final exam flow: source exam may have no class_id; access comes from final_exams.class_id.
    if (finalExamId) {
      const { data: finalExam } = await adminSupabase
        .from('final_exams')
        .select('id, source_exam_id, class_id')
        .eq('id', finalExamId)
        .maybeSingle()

      const finalExamRow = finalExam as { id: string; source_exam_id?: string | null; class_id?: string | null } | null
      if (finalExamRow && finalExamRow.source_exam_id === examId && finalExamRow.class_id) {
        const { data: finalEnrollment } = await adminSupabase
          .from('class_enrollments')
          .select('id')
          .eq('class_id', finalExamRow.class_id)
          .eq('student_id', studentId)
          .eq('status', 'active')
          .maybeSingle()
        if (finalEnrollment) {
          hasAccess = true
        }
      }
    }

    if (!hasAccess) {
    // Course final exam: allow if student is enrolled in a course that has this exam as final_exam_id
    const { data: coursesWithExam } = await adminSupabase
      .from('courses')
      .select('id, metadata')
      .eq('is_archived', false)
      .not('metadata', 'is', null)
    const courseIds = (coursesWithExam ?? []).filter((c: { id: string; metadata?: unknown }) => {
      const meta = c.metadata as { final_exam_id?: string } | null | undefined
      return meta?.final_exam_id === examId
    }).map((c: { id: string }) => c.id)
    if (courseIds.length > 0) {
      const { data: courseEnrollment } = await adminSupabase
        .from('course_enrollments')
        .select('id')
        .in('course_id', courseIds)
        .eq('student_id', studentId)
        .limit(1)
        .maybeSingle()
      hasAccess = !!courseEnrollment
    }
    }
  }

  if (!hasAccess) return null

  const allQuestions = Array.isArray(exam.questions) ? exam.questions : []
  let questions = allQuestions
  if (finalExamId) {
    const { data: finalExam } = await adminSupabase
      .from('final_exams')
      .select('id, selected_question_ids, source_entries, question_mode, questions_per_attempt')
      .eq('id', finalExamId)
      .maybeSingle()

    if (finalExam) {
      const row = finalExam as {
        selected_question_ids?: string[] | null
        source_entries?: Array<{ exam_id?: string; selected_question_ids?: string[] | null }> | null
        question_mode?: 'fixed_selection' | 'random_pool' | null
        questions_per_attempt?: number | null
      }
      const entry = Array.isArray(row.source_entries)
        ? row.source_entries.find((e) => e?.exam_id === examId)
        : null
      const selectedIds =
        (entry?.selected_question_ids ?? row.selected_question_ids ?? null)?.filter(Boolean) ?? null
      const effectiveIds = selectFinalExamQuestionIds({
        examQuestionIds: allQuestions.map((q: any) => String(q?.id ?? '')),
        selectedQuestionIds: selectedIds,
        mode: row.question_mode === 'random_pool' ? 'random_pool' : 'fixed_selection',
        questionsPerAttempt: row.questions_per_attempt ?? null,
        studentId,
        finalExamId,
      })
      const idSet = new Set(effectiveIds)
      questions = allQuestions.filter((q: any) => idSet.has(String(q?.id ?? '')))
    }
  }

  if (questions.length === 0) return null

  let pointsEarned = 0
  const pointsPerQuestion = 1

  for (const q of questions as any[]) {
    const questionId = q.id || `q-${Math.random()}`
    const studentAnswer = answers[questionId]
    const correctAnswer = q.correct_answer ?? q.correctAnswer ?? null

    if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '' ||
        (Array.isArray(studentAnswer) && studentAnswer.length === 0)) {
      continue
    }

    if (correctAnswer == null) continue

    let isCorrect = false
    if (q.type === 'multiple_choice' || q.type === 'true_false') {
      isCorrect = String(studentAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim()
    } else if (q.type === 'multiple_select') {
      const studentArray = Array.isArray(studentAnswer) ? studentAnswer.map((s: any) => String(s).toLowerCase().trim()) : [String(studentAnswer).toLowerCase().trim()]
      const correctArray = Array.isArray(correctAnswer) ? correctAnswer.map((c: any) => String(c).toLowerCase().trim()) : [String(correctAnswer).toLowerCase().trim()]
      isCorrect = studentArray.length === correctArray.length &&
        studentArray.every((ans: string) => correctArray.includes(ans)) &&
        correctArray.every((ans: string) => studentArray.includes(ans))
    } else if (q.type === 'fill_blank') {
      isCorrect = String(studentAnswer).toLowerCase().trim() === String(correctAnswer).toLowerCase().trim()
    }

    if (isCorrect) pointsEarned += pointsPerQuestion
  }

  const totalPoints = questions.length * pointsPerQuestion
  const percentage = totalPoints > 0 ? Math.round((pointsEarned / totalPoints) * 100) : 0
  return percentage
}
