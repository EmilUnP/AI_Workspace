'use server'

import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { createAdminClient } from '@eduator/auth/supabase/admin'
import { revalidatePath } from 'next/cache'

async function getTeacherId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) return null
  
  return { teacherId: profile.id, organizationId: profile.organization_id }
}

export async function scheduleMaterial(
  materialId: string,
  type: 'exam' | 'lesson',
  startTime: Date,
  endTime: Date,
  classIds: string[]
) {
  const teacherData = await getTeacherId()
  if (!teacherData) {
    return { error: 'Not authenticated' }
  }
  
  const { teacherId, organizationId } = teacherData
  const supabase = createAdminClient()
  
  // For now, we'll schedule for the first class (can be extended for multi-class)
  const classId = classIds[0]
  
  if (!classId) {
    return { error: 'No class selected' }
  }
  
  const table = type === 'exam' ? 'exams' : 'lessons'
  
  // Update the material with schedule information
  const { error } = await supabase
    .from(table)
    .update({
      class_id: classId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', materialId)
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)
  
  if (error) {
    console.error('Error scheduling material:', error)
    return { error: error.message }
  }
  
  revalidatePath('/teacher/calendar', 'layout')
  return { success: true }
}

export async function updateScheduledEvent(
  eventId: string,
  type: 'exam' | 'lesson',
  updates: {
    startTime?: Date
    endTime?: Date
    classId?: string
  }
) {
  const teacherData = await getTeacherId()
  if (!teacherData) {
    return { error: 'Not authenticated' }
  }
  
  const { teacherId, organizationId } = teacherData
  const supabase = createAdminClient()
  
  const table = type === 'exam' ? 'exams' : 'lessons'
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }
  
  if (updates.startTime) {
    updateData.start_time = updates.startTime.toISOString()
  }
  if (updates.endTime) {
    updateData.end_time = updates.endTime.toISOString()
  }
  if (updates.classId) {
    updateData.class_id = updates.classId
  }
  
  const { error } = await supabase
    .from(table)
    .update(updateData)
    .eq('id', eventId)
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)
  
  if (error) {
    console.error('Error updating scheduled event:', error)
    return { error: error.message }
  }
  
  revalidatePath('/teacher/calendar', 'layout')
  return { success: true }
}

export async function deleteScheduledEvent(
  eventId: string,
  type: 'exam' | 'lesson'
) {
  const teacherData = await getTeacherId()
  if (!teacherData) {
    return { error: 'Not authenticated' }
  }
  
  const { teacherId, organizationId } = teacherData
  const supabase = createAdminClient()
  
  const table = type === 'exam' ? 'exams' : 'lessons'
  
  // Remove schedule by clearing start_time and end_time
  const { error } = await supabase
    .from(table)
    .update({
      start_time: null,
      end_time: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)
  
  if (error) {
    console.error('Error deleting scheduled event:', error)
    return { error: error.message }
  }
  
  revalidatePath('/teacher/calendar', 'layout')
  return { success: true }
}

// Mark a scheduled exam/lesson as published (used)
export async function confirmMaterial(
  materialId: string,
  type: 'exam' | 'lesson'
) {
  const teacherData = await getTeacherId()
  if (!teacherData) {
    return { error: 'Not authenticated' }
  }

  const { teacherId, organizationId } = teacherData
  const supabase = createAdminClient()
  const table = type === 'exam' ? 'exams' : 'lessons'

  const { error } = await supabase
    .from(table)
    .update({
      is_published: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', materialId)
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)

  if (error) {
    console.error('Error confirming material (publish):', error)
    return { error: error.message }
  }

  revalidatePath('/teacher/calendar', 'layout')
  return { success: true }
}

// Revert a published exam/lesson back to draft (unpublish)
export async function unpublishMaterial(
  materialId: string,
  type: 'exam' | 'lesson'
) {
  const teacherData = await getTeacherId()
  if (!teacherData) {
    return { error: 'Not authenticated' }
  }

  const { teacherId, organizationId } = teacherData
  const supabase = createAdminClient()
  const table = type === 'exam' ? 'exams' : 'lessons'

  const { error } = await supabase
    .from(table)
    .update({
      is_published: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', materialId)
    .eq('created_by', teacherId)
    .eq('organization_id', organizationId)

  if (error) {
    console.error('Error unpublishing material:', error)
    return { error: error.message }
  }

  revalidatePath('/teacher/calendar', 'layout')
  return { success: true }
}
