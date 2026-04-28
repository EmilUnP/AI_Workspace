import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Calculate date for 6 months ago
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Get class IDs for this organization
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('organization_id', organizationId)

    const classIds = classData?.map(c => c.id) || []

    // Get enrollments over last 6 months
    const { data: enrollments } = classIds.length > 0
      ? await supabase
          .from('class_enrollments')
          .select('enrolled_at')
          .gte('enrolled_at', sixMonthsAgo.toISOString())
          .in('class_id', classIds)
      : { data: null }

    // Group enrollments by month
    const enrollmentByMonth: Record<string, number> = {}
    enrollments?.forEach(enrollment => {
      const date = new Date(enrollment.enrolled_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      enrollmentByMonth[monthKey] = (enrollmentByMonth[monthKey] || 0) + 1
    })

    // Get last 6 months labels
    const monthLabels: string[] = []
    const enrollmentData: number[] = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })
      monthLabels.push(monthName)
      enrollmentData.push(enrollmentByMonth[monthKey] || 0)
    }

    // Get exams created over last 6 months
    const { data: examData } = await supabase
      .from('exams')
      .select('created_at')
      .eq('organization_id', organizationId)

    const examsByMonth: Record<string, number> = {}
    examData?.forEach(exam => {
      const examDate = new Date(exam.created_at)
      if (examDate >= sixMonthsAgo) {
        const monthKey = `${examDate.getFullYear()}-${String(examDate.getMonth() + 1).padStart(2, '0')}`
        examsByMonth[monthKey] = (examsByMonth[monthKey] || 0) + 1
      }
    })

    const examDataByMonth: number[] = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      examDataByMonth.push(examsByMonth[monthKey] || 0)
    }

    // Get total enrollments
    const { count: totalEnrollments } = classIds.length > 0
      ? await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .in('class_id', classIds)
          .eq('status', 'active')
      : { count: 0 }

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: recentEnrollments } = classIds.length > 0
      ? await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .gte('enrolled_at', thirtyDaysAgo.toISOString())
          .in('class_id', classIds)
      : { count: 0 }

    const { count: recentExams } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Get exam IDs for recent submissions
    const { data: recentExamData } = await supabase
      .from('exams')
      .select('id')
      .eq('organization_id', organizationId)

    const recentExamIds = recentExamData?.map(e => e.id) || []

    const { count: recentSubmissions } = recentExamIds.length > 0
      ? await supabase
          .from('exam_submissions')
          .select('*', { count: 'exact', head: true })
          .in('exam_id', recentExamIds)
          .gte('created_at', thirtyDaysAgo.toISOString())
      : { count: 0 }

    return NextResponse.json({
      enrollmentByMonth: {
        labels: monthLabels,
        data: enrollmentData,
      },
      examByMonth: {
        labels: monthLabels,
        data: examDataByMonth,
      },
      totalEnrollments: totalEnrollments || 0,
      recentActivity: {
        enrollments: recentEnrollments || 0,
        exams: recentExams || 0,
        submissions: recentSubmissions || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching activity data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity data' },
      { status: 500 }
    )
  }
}
