import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { getTeacherStats } from '../../../teacher/reports/server-utils'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const tab = searchParams.get('tab') as 'overview' | 'exams' | 'students' | null
    const teacherId = searchParams.get('teacherId')
    const organizationId = searchParams.get('organizationId')
    
    if (!teacherId || !organizationId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }
    
    // Verify the teacherId belongs to the current user
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || profile.id !== teacherId || profile.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const stats = await getTeacherStats(teacherId, organizationId, tab || 'overview')
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
