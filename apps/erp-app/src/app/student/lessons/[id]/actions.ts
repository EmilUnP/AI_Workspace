'use server'

import { createClient } from '@eduator/auth/supabase/server'
import { upsertLessonCompletion, getStudentLessonProgress, restartLessonProgress } from '@eduator/core/utils/student-lessons'

export async function markLessonCompleted(input: { lessonId: string; timeSpentSeconds: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return { error: 'Profile not found' }
  }

  const result = await upsertLessonCompletion(
    supabase,
    input.lessonId,
    profile.id,
    input.timeSpentSeconds,
  )

  return { error: result.error ?? null }
}

export async function getCurrentLessonProgress(lessonId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!profile) return null

  return getStudentLessonProgress(supabase, lessonId, profile.id)
}

export async function restartLesson(input: { lessonId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return { error: 'Profile not found' }
  }

  const result = await restartLessonProgress(supabase, input.lessonId, profile.id)
  return { error: result.error ?? null }
}

