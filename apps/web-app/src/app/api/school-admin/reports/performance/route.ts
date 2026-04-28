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

    const examIds = examData?.map(e => e.id) || []

    // Get exam submissions data
    const { data: submissions } = examIds.length > 0
      ? await supabase
          .from('exam_submissions')
          .select('score, percentage, is_passed, status')
          .in('exam_id', examIds)
      : { data: null }

    // Calculate exam performance metrics
    const gradedSubmissions = submissions?.filter(s => s.status === 'graded' && s.percentage !== null) || []
    const averageScore = gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / gradedSubmissions.length)
      : 0
    const passRate = gradedSubmissions.length > 0
      ? Math.round((gradedSubmissions.filter(s => s.is_passed).length / gradedSubmissions.length) * 100)
      : 0

    // Get submission status counts
    const submissionStatusCounts = {
      in_progress: submissions?.filter(s => s.status === 'in_progress').length || 0,
      submitted: submissions?.filter(s => s.status === 'submitted').length || 0,
      graded: submissions?.filter(s => s.status === 'graded').length || 0,
      reviewed: submissions?.filter(s => s.status === 'reviewed').length || 0,
    }

    // Calculate top performers (score > 80%) and needs improvement (score < 60%)
    const topPerformers = gradedSubmissions.filter(s => (s.percentage || 0) > 80).length
    const needsImprovement = gradedSubmissions.filter(s => (s.percentage || 0) < 60).length

    return NextResponse.json({
      averageScore,
      passRate,
      totalSubmissions: submissions?.length || 0,
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
