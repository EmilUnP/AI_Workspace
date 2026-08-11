'use server'

import { revalidatePath } from 'next/cache'
import { getAccessToken } from '@/lib/backend-auth'
import { getApiUrl } from '@/lib/portal-urls'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

interface UpdateLessonInput {
  title?: string
  topic?: string
  description?: string
  content?: string
  duration_minutes?: number
}

export async function updateLesson(lessonId: string, input: UpdateLessonInput) {
  try {
    const token = await getAccessToken()
    if (!token) return { error: 'Not authenticated' }

    const response = await fetch(`${getApiUrl()}/v1/lessons/${lessonId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...webAppBackendAuthHeaders(token),
      },
      body: JSON.stringify(input),
      cache: 'no-store',
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      return { error: payload.error || 'Failed to update lesson' }
    }

    revalidatePath(`/school-admin/lessons/${lessonId}`)
    return { success: true }
  } catch (error) {
    console.error('Update lesson error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function regenerateAudio(lessonId: string) {
  try {
    const token = await getAccessToken()
    if (!token) return { error: 'Not authenticated' }

    const response = await fetch(`${getApiUrl()}/v1/lessons/${lessonId}/audio`, {
      method: 'POST',
      headers: webAppBackendAuthHeaders(token),
      cache: 'no-store',
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      audio_url?: string | null
    }

    if (!response.ok) {
      return { error: payload.error || 'Failed to generate audio' }
    }

    if (!payload.audio_url) {
      return { error: 'Failed to generate audio' }
    }

    revalidatePath(`/school-admin/lessons/${lessonId}`)
    return { success: true, audioUrl: payload.audio_url }
  } catch (error) {
    console.error('Regenerate audio error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteLesson(lessonId: string) {
  try {
    const token = await getAccessToken()
    if (!token) return { error: 'Not authenticated' }

    const response = await fetch(`${getApiUrl()}/v1/lessons/${lessonId}`, {
      method: 'DELETE',
      headers: webAppBackendAuthHeaders(token),
      cache: 'no-store',
    })

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      return { error: payload.error || 'Failed to delete lesson' }
    }

    revalidatePath('/school-admin/lessons')
    return { success: true }
  } catch (error) {
    console.error('Delete lesson error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
