import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

export const TEACHER_EXAMS_PER_PAGE = 10

export type TeacherExamRow = {
  id: string
  title: string
  description: string | null
  topics: string[]
  languages: string[]
  questionCount: number
  duration_minutes: number | null
  is_published: boolean
  usedInClass: boolean
  className: string | null
  usedInCalendar: boolean
  created_at: string
}

export type TeacherExamsResult = {
  data: TeacherExamRow[]
  count: number
  page: number
}

export async function getTeacherExams(
  _supabase: unknown,
  _teacherId: string,
  _workspaceId: string,
  params?: { page?: string; search?: string }
): Promise<TeacherExamsResult> {
  const page = Number(params?.page || 1)
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  const { cookies } = await import('next/headers')
  const token = (await cookies()).get('access_token')?.value
  if (!token) return { data: [], count: 0, page }

  const searchParams = new URLSearchParams({
    page: String(page),
    perPage: String(TEACHER_EXAMS_PER_PAGE),
  })
  if (params?.search?.trim()) searchParams.set('search', params.search.trim())

  const response = await fetch(`${backendBase}/v1/exams?${searchParams.toString()}`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })

  if (!response.ok) return { data: [], count: 0, page }
  const payload = (await response.json()) as {
    items?: TeacherExamRow[]
    total?: number
    page?: number
  }

  return {
    data: Array.isArray(payload.items) ? payload.items : [],
    count: Number(payload.total || 0),
    page: Number(payload.page || page),
  }
}

export async function getTeacherExamStats(_supabase: unknown, _teacherId: string, _workspaceId: string) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  const { cookies } = await import('next/headers')
  const token = (await cookies()).get('access_token')?.value
  if (!token) {
    return { total: 0, published: 0, draft: 0, totalQuestions: 0 }
  }

  const response = await fetch(`${backendBase}/v1/exams/stats`, {
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })
  if (!response.ok) {
    return { total: 0, published: 0, draft: 0, totalQuestions: 0 }
  }

  const payload = (await response.json()) as {
    total?: number
    published?: number
    draft?: number
    totalQuestions?: number
  }
  return {
    total: Number(payload.total || 0),
    published: Number(payload.published || 0),
    draft: Number(payload.draft || 0),
    totalQuestions: Number(payload.totalQuestions || 0),
  }
}
