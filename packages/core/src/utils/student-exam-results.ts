/**
 * Shared utilities for student exam results functionality
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { selectFinalExamQuestionIds } from './final-exam-question-selection'

export interface ExamResultData {
  /** When true, do not show score/details; show "teacher will share results" message (final exam setting). */
  resultsHidden?: boolean
  /** Whether to show correct answers in the results view (teacher setting). */
  showCorrectAnswers: boolean
  /** Whether to show explanations in the results view (teacher setting). */
  showExplanations: boolean
  exam: {
    id: string
    title: string
    description?: string | null
    class_name?: string | null
  }
  submission: {
    id: string
    answers: Record<string, string | string[]>
    score: number | null
    submitted_at: string | null
  }
  questionResults: Array<{
    questionId: string
    question: string
    question_html?: string
    type: 'multiple_choice' | 'true_false' | 'multiple_select' | 'fill_blank'
    options?: string[]
    correctAnswer?: string | string[]
    studentAnswer: string | string[]
    isCorrect: boolean
    points: number
    pointsEarned: number
    explanation?: string
  }>
  statistics: {
    totalQuestions: number
    correctAnswers: number
    incorrectAnswers: number
    unanswered: number
    totalPoints: number
    pointsEarned: number
    percentage: number
  }
  /** Passing score (0–100) for this exam; used to show "passed" and certificate link. */
  passingScore?: number
}

/**
 * Get exam results for a student
 * Includes correct answers for review
 */
export async function getStudentExamResults(
  _supabase: SupabaseClient,
  examId: string,
  studentId: string,
  organizationId?: string | null
): Promise<ExamResultData | null> {
  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient()

  // Get exam with settings and questions (settings control what we expose in results)
  const baseQuery = adminSupabase
    .from('exams')
    .select(`
      id,
      title,
      description,
      questions,
      settings,
      course_generated,
      metadata,
      classes(name)
    `)
    .eq('id', examId)
    .eq('is_archived', false)

  const examQuery = organizationId 
    ? baseQuery.eq('organization_id', organizationId)
    : baseQuery

  const { data: examData, error: examError } = await examQuery.single()

  if (examError || !examData) {
    console.error('Error fetching exam:', examError)
    return null
  }

  // Get submission (include final_exam_id when present)
  const { data: submission, error: submissionError } = await adminSupabase
    .from('exam_submissions')
    .select('id, answers, score, submitted_at, final_exam_id')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (submissionError) {
    console.error('Error fetching submission:', submissionError)
    return null
  }

  if (!submission) {
    return null
  }

  // If this submission was for a final exam, check whether to hide results until teacher releases
  const finalExamId = (submission as { final_exam_id?: string | null }).final_exam_id
  if (finalExamId) {
    const { data: finalExam } = await adminSupabase
      .from('final_exams')
      .select('show_result_to_student')
      .eq('id', finalExamId)
      .maybeSingle()
    const showResult = (finalExam as { show_result_to_student?: boolean } | null)?.show_result_to_student
    if (showResult === false) {
      return {
        resultsHidden: true,
        showCorrectAnswers: false,
        showExplanations: false,
        passingScore: 70,
        exam: {
          id: examData.id,
          title: examData.title,
          description: examData.description ?? null,
          class_name: null,
        },
        submission: {
          id: submission.id,
          answers: submission.answers || {},
          score: null,
          submitted_at: submission.submitted_at,
        },
        questionResults: [],
        statistics: {
          totalQuestions: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          unanswered: 0,
          totalPoints: 0,
          pointsEarned: 0,
          percentage: 0,
        },
      }
    }
  }

  const classData: any = examData.classes
  const className = Array.isArray(classData) 
    ? (classData[0] as any)?.name 
    : (classData as any)?.name || null

  const settings = (examData.settings || {}) as { show_correct_answers?: boolean; show_explanations?: boolean; passing_score?: number }
  const passingScore = settings.passing_score ?? 70
  const examTyped = examData as { course_generated?: number; metadata?: { from_course_id?: string } | null }
  const isCourseFinal = examTyped.course_generated === 1 || !!examTyped.metadata?.from_course_id
  // Course final: show correct answer and explanation only when the student got that question right (no reveal for wrong/unanswered).
  const showCorrectAnswers = isCourseFinal ? false : (settings.show_correct_answers !== false)
  const showExplanations = isCourseFinal ? false : (settings.show_explanations !== false)

  // Process questions and calculate results
  const allQuestions = Array.isArray(examData.questions) ? examData.questions : []
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
  const studentAnswers = submission.answers || {}
  
  let totalPoints = 0
  let pointsEarned = 0
  let correctCount = 0
  let incorrectCount = 0
  let unansweredCount = 0

  // Score = 1 per question (points concept removed)
  const pointsPerQuestion = 1

  const questionResults = questions.map((q: any) => {
    const questionId = q.id || `q-${Math.random()}`
    const studentAnswer = studentAnswers[questionId]
    const correctAnswer = q.correct_answer || q.correctAnswer || null

    let isCorrect = false
    let earned = 0

    if (studentAnswer === undefined || studentAnswer === null || studentAnswer === '' ||
        (Array.isArray(studentAnswer) && studentAnswer.length === 0)) {
      unansweredCount++
    } else if (correctAnswer !== null && correctAnswer !== undefined) {
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

      if (isCorrect) {
        earned = pointsPerQuestion
        pointsEarned += pointsPerQuestion
        correctCount++
      } else {
        incorrectCount++
      }
    } else {
      unansweredCount++
    }

    totalPoints += pointsPerQuestion

    // Course final: only include correct answer (and explanation) when student got it right; never reveal for wrong/unanswered.
    const includeCorrectAnswer = isCourseFinal ? isCorrect : showCorrectAnswers
    const includeExplanation = isCourseFinal ? (isCorrect && typeof q.explanation === 'string') : (showExplanations && typeof q.explanation === 'string')
    return {
      questionId,
      question: q.question || q.text || '',
      question_html: q.question_html,
      type: q.type || 'multiple_choice',
      options: q.options || [],
      correctAnswer: includeCorrectAnswer ? correctAnswer : undefined,
      studentAnswer: studentAnswer || '',
      isCorrect,
      points: pointsPerQuestion,
      pointsEarned: earned,
      explanation: includeExplanation ? q.explanation : undefined,
    }
  })

  const percentage = totalPoints > 0 ? Math.round((pointsEarned / totalPoints) * 100) : 0

  return {
    showCorrectAnswers,
    showExplanations,
    passingScore,
    exam: {
      id: examData.id,
      title: examData.title,
      description: examData.description,
      class_name: className,
    },
    submission: {
      id: submission.id,
      answers: submission.answers,
      score: submission.score || percentage,
      submitted_at: submission.submitted_at,
    },
    questionResults,
    statistics: {
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      unanswered: unansweredCount,
      totalPoints,
      pointsEarned,
      percentage,
    },
  }
}
