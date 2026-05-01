import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    void request

    const supabase = await createServerClient()

    // Get exam IDs for this organization
    const { data: examData } = await supabase
      .from('exams')
      .select('id')

    const examRows = Array.isArray(examData) ? (examData as Array<{ id: string }>) : []
    const examIds = examRows.map((e) => e.id)

    // Get exam submissions data
    const { data: submissions } = examIds.length > 0
      ? await supabase
          .from('exam_submissions')
          .select('score, percentage, is_passed, status')
          .in('exam_id', examIds)
      : { data: null }

    // Calculate exam performance metrics
    const submissionRows = Array.isArray(submissions)
      ? (submissions as Array<{ status: string; percentage: number | null; is_passed: boolean }>)
      : []
    const gradedSubmissions = submissionRows.filter((s) => s.status === 'graded' && s.percentage !== null)
    const averageScore = gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((sum: number, s: { percentage: number | null }) => sum + (s.percentage || 0), 0) / gradedSubmissions.length)
      : 0
    const passRate = gradedSubmissions.length > 0
      ? Math.round((gradedSubmissions.filter((s: { is_passed: boolean }) => s.is_passed).length / gradedSubmissions.length) * 100)
      : 0

    // Get submission status counts
    const submissionStatusCounts = {
      in_progress: submissionRows.filter((s) => s.status === 'in_progress').length,
      submitted: submissionRows.filter((s) => s.status === 'submitted').length,
      graded: submissionRows.filter((s) => s.status === 'graded').length,
      reviewed: submissionRows.filter((s) => s.status === 'reviewed').length,
    }

    // Calculate top performers (score > 80%) and needs improvement (score < 60%)
    const topPerformers = gradedSubmissions.filter((s: { percentage: number | null }) => (s.percentage || 0) > 80).length
    const needsImprovement = gradedSubmissions.filter((s: { percentage: number | null }) => (s.percentage || 0) < 60).length

    return NextResponse.json({
      averageScore,
      passRate,
      totalSubmissions: submissionRows.length,
      submissionStatusCounts,
      topPerformers,
      needsImprovement,
    })
  } catch (error) {
    console.error('Error fetching performance data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    )
  }
}
