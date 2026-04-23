/**
 * Debug: GET lesson language from DB (to verify stored value).
 * GET /api/teacher/lessons/[id]/language
 * Returns { id, language, metadata_language } for the lesson if you own it.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@eduator/auth/supabase/server'
import { getDbClient } from '@eduator/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 401 })
    }

    const { id: lessonId } = await context.params
    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 })
    }

    const db = getDbClient()
    const { data: row, error } = await db
      .from('lessons')
      .select('id, language, metadata')
      .eq('id', lessonId)
      .eq('created_by', profile.id)
      .single()

    if (error || !row) {
      return NextResponse.json(
        { error: error?.message ?? 'Lesson not found or access denied' },
        { status: error?.code === 'PGRST116' ? 404 : 500 }
      )
    }

    const metadata = row.metadata as { language?: string } | null
    return NextResponse.json({
      id: row.id,
      language: row.language ?? null,
      metadata_language: metadata?.language ?? null,
    })
  } catch (e) {
    console.error('[Lesson language debug]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    )
  }
}
