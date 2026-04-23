/**
 * Teacher Documents API Route
 * Returns list of documents for the authenticated teacher
 */

import { NextResponse } from 'next/server'
import { createClient } from '@eduator/auth/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get profile with organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id, profile_type')
      .eq('user_id', user.id)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 401 })
    }
    
    // Check if teacher
    if (profile.profile_type !== 'teacher' && profile.profile_type !== 'school_superadmin') {
      return NextResponse.json({ error: 'Only teachers can access documents' }, { status: 403 })
    }
    
    // Get documents for this teacher's organization
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title, file_type, file_name, description, created_at')
      .eq('organization_id', profile.organization_id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    
    if (docsError) {
      console.error('Error fetching documents:', docsError)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }
    
    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
