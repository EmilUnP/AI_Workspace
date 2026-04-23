/**
 * Shared utilities for student exams functionality
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { StudentExamItem } from '@eduator/ui'
import { createAdminClient } from '@eduator/auth/supabase/admin'

/**
 * Get available exams for a student
 * Uses admin client to bypass RLS and shows all exams (including drafts) like in class detail page
 */
export async function getAvailableExams(
  supabase: SupabaseClient,
  studentId: string,
  organizationId?: string | null
): Promise<StudentExamItem[]> {
  // Verify student enrollment first using regular client
  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('student_id', studentId)
    .eq('status', 'active')
  
  const classIds = enrollments?.map(e => e.class_id) || []
  
  if (classIds.length === 0) {
    return []
  }
  
  // Use admin client to bypass RLS (we've already verified enrollment)
  const adminSupabase = createAdminClient()
  
  // Build exam query - removed is_published filter to show all exams like in class detail; exclude course-generated
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
      class_id,
      is_published,
      created_by,
      language,
      translations,
      classes(name),
      creator:profiles!created_by(
        id,
        full_name,
        avatar_url
      ),
      questions
    `)
    .eq('is_archived', false)
    .in('class_id', classIds)
    .or('course_generated.eq.0,course_generated.is.null')
    .order('created_at', { ascending: false })
  
  // Add organization filter for ERP
  const examQuery = organizationId 
    ? baseQuery.eq('organization_id', organizationId)
    : baseQuery
  
  const { data: exams, error } = await examQuery
  
  if (error) {
    console.error('Error fetching exams:', error)
    return []
  }
  
  if (!exams || exams.length === 0) {
    return []
  }
  
  // Get all exam submissions for this student (multiple attempts per exam)
  const examIds = exams.map(e => e.id)
  const { data: submissions } = await supabase
    .from('exam_submissions')
    .select('exam_id, score')
    .eq('student_id', studentId)
    .in('exam_id', examIds)
    .not('score', 'is', null)
  
  // Group by exam_id: attempt_count, best_score, average_score
  const statsByExam = new Map<string, { attempt_count: number; best_score: number; average_score: number }>()
  if (submissions?.length) {
    const byExam = new Map<string, number[]>()
    submissions.forEach((sub: { exam_id: string; score: number | null }) => {
      const score = sub.score != null ? Number(sub.score) : null
      if (score == null || Number.isNaN(score)) return
      const list = byExam.get(sub.exam_id) || []
      list.push(score)
      byExam.set(sub.exam_id, list)
    })
    byExam.forEach((scores, examId) => {
      const attempt_count = scores.length
      const best_score = Math.max(...scores)
      const average_score = Math.round(scores.reduce((a, b) => a + b, 0) / attempt_count)
      statsByExam.set(examId, { attempt_count, best_score, average_score })
    })
  }
  
  // Extract languages from exam
  function extractLanguages(exam: { language?: string | null; translations?: unknown }): string[] {
    const languages: string[] = []
    
    // Add primary language first
    const primaryLang = exam.language || 'en'
    languages.push(primaryLang)
    
    // Check translations object for available languages
    if (exam.translations && typeof exam.translations === 'object' && !Array.isArray(exam.translations)) {
      const translationKeys = Object.keys(exam.translations as Record<string, unknown>)
      translationKeys.forEach(lang => {
        if (!languages.includes(lang)) {
          languages.push(lang)
        }
      })
    }
    
    return languages
  }
  
  // Format exams for display
  return exams.map((exam: any) => {
    const classData: any = exam.classes
    const className = Array.isArray(classData) 
      ? (classData[0] as any)?.name 
      : (classData as any)?.name || null
    
    const creator = Array.isArray(exam.creator) 
      ? exam.creator[0] 
      : exam.creator || null
    
    const stats = statsByExam.get(exam.id)
    const questionCount = Array.isArray(exam.questions) ? exam.questions.length : 0
    
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      duration_minutes: exam.duration_minutes,
      created_at: exam.created_at,
      class_name: className,
      class_id: exam.class_id,
      question_count: questionCount,
      has_submitted: !!(stats && stats.attempt_count > 0),
      submission_score: stats ? stats.best_score : null,
      attempt_count: stats?.attempt_count ?? 0,
      best_score: stats?.best_score ?? null,
      average_score: stats?.average_score ?? null,
      start_time: exam.start_time,
      end_time: exam.end_time,
      is_published: exam.is_published,
      created_by: exam.created_by,
      languages: extractLanguages(exam),
      creator: creator ? {
        id: creator.id,
        full_name: creator.full_name,
        avatar_url: creator.avatar_url
      } : null,
    }
  })
}
