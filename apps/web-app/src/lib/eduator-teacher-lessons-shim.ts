import 'server-only'
import { cookies } from 'next/headers'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

export const TEACHER_LESSONS_PER_PAGE = 10

export async function getTeacherLessons(
  _supabase: unknown,
  _teacherId: string,
  _workspaceId: string,
  params?: { page?: string; search?: string }
) {
  const page = Number(params?.page || 1)
  const token = (await cookies()).get('access_token')?.value
  if (!token) return { data: [], count: 0, page }

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  const searchParams = new URLSearchParams({
    page: String(page),
    perPage: String(TEACHER_LESSONS_PER_PAGE),
  })
  if (params?.search?.trim()) searchParams.set('search', params.search.trim())

  const response = await fetch(`${backendBase}/v1/lessons?${searchParams.toString()}`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) return { data: [], count: 0, page }

  const payload = (await response.json()) as {
    items?: unknown[]
    total?: number
    page?: number
  }

  return {
    data: Array.isArray(payload.items) ? payload.items : [],
    count: Number(payload.total || 0),
    page: Number(payload.page || page),
  }
}

export async function getTeacherLessonStats(_supabase: unknown, _teacherId: string, _workspaceId: string) {
  return {
    total: 0,
    published: 0,
    draft: 0,
    totalDuration: 0,
  }
}
