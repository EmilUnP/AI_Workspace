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

    // Get teachers count
    const { count: teacherCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('profile_type', 'teacher')
      .eq('approval_status', 'approved')

    // Get classes count
    const { count: classCount } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // Get active classes count
    const { count: activeClassCount } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    // Get exams count
    const { count: examCount } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // Get published exams count
    const { count: publishedExamCount } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_published', true)

    // Get total enrollments
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('organization_id', organizationId)

    const classIds = classData?.map(c => c.id) || []

    const { count: totalEnrollments } = classIds.length > 0
      ? await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .in('class_id', classIds)
          .eq('status', 'active')
      : { count: 0 }

    return NextResponse.json({
      teachers: teacherCount || 0,
      learners: 0,
      totalClasses: classCount || 0,
      activeClasses: activeClassCount || 0,
      exams: examCount || 0,
      publishedExams: publishedExamCount || 0,
      totalEnrollments: totalEnrollments || 0,
    })
  } catch (error) {
    console.error('Error fetching overview data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overview data' },
      { status: 500 }
    )
  }
}
