import { getCurrentUser, listUsers } from '@/lib/backend-auth'
import { getTeacherExamStats } from '@eduator/core/utils/teacher-exams'
import { BarChart3, BookOpen, Coins, FileText, MessageSquare, Shield, Sparkles, Users } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

type DashboardStats = {
  recentUsers: Awaited<ReturnType<typeof listUsers>>
  lessonsTotal: number
  examsTotal: number
  examsPublished: number
  totalQuestions: number
  documentsTotal: number
  documentsReady: number
  recentLessons: Array<{ id: string; title: string; created_at: string }>
}

async function getDashboardStats(isAdmin: boolean): Promise<DashboardStats> {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  const { cookies } = await import('next/headers')
  const token = (await cookies()).get('access_token')?.value

  if (!token) {
    return {
      recentUsers: [],
      lessonsTotal: 0,
      examsTotal: 0,
      examsPublished: 0,
      totalQuestions: 0,
      documentsTotal: 0,
      documentsReady: 0,
      recentLessons: [],
    }
  }

  const safeFetch = async (url: string) => {
    try {
      return await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
    } catch {
      return null
    }
  }

  const [users, lessonsRes, documentsRes, examStats] = await Promise.all([
    isAdmin ? listUsers({ limit: 100, offset: 0 }) : Promise.resolve([]),
    safeFetch(`${backendBase}/v1/lessons?page=1&perPage=5`),
    safeFetch(`${backendBase}/v1/documents`),
    getTeacherExamStats(null, '', ''),
  ])

  const lessonsPayload = lessonsRes?.ok
    ? ((await lessonsRes.json()) as {
        total?: number
        items?: Array<{ id: string; title: string; created_at: string }>
      })
    : { total: 0, items: [] }
  const documentsPayload = documentsRes?.ok
    ? ((await documentsRes.json()) as { items?: Array<{ status?: string }> })
    : { items: [] }

  const documents = Array.isArray(documentsPayload.items) ? documentsPayload.items : []
  const documentsReady = documents.filter((doc) => {
    const status = String(doc.status || '').toLowerCase()
    return status === 'ready' || status === 'completed'
  }).length

  if (!isAdmin) {
    return {
      recentUsers: users,
      lessonsTotal: Number(lessonsPayload.total || 0),
      examsTotal: Number(examStats.total || 0),
      examsPublished: Number(examStats.published || 0),
      totalQuestions: Number(examStats.totalQuestions || 0),
      documentsTotal: documents.length,
      documentsReady,
      recentLessons: Array.isArray(lessonsPayload.items) ? lessonsPayload.items : [],
    }
  }

  return {
    recentUsers: users.slice(0, 5),
    lessonsTotal: Number(lessonsPayload.total || 0),
    examsTotal: Number(examStats.total || 0),
    examsPublished: Number(examStats.published || 0),
    totalQuestions: Number(examStats.totalQuestions || 0),
    documentsTotal: documents.length,
    documentsReady,
    recentLessons: Array.isArray(lessonsPayload.items) ? lessonsPayload.items : [],
  }
}

export default async function SchoolAdminDashboard() {
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect('/auth/login')
  if (currentUser.role !== 'admin' && currentUser.role !== 'operator') redirect('/app')

  const isAdmin = currentUser.role === 'admin'
  const stats = await getDashboardStats(isAdmin)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Admin Dashboard</h1>
          <p className="mt-1 text-gray-500">Main workspace for daily operations and AI tools</p>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">Role: {currentUser.role}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-700">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-500">Lessons Generated</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{stats.lessonsTotal}</p>
            <p className="mt-1 text-xs text-gray-500">All lessons created by your school account</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-700">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-500">Exams Created</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{stats.examsTotal}</p>
            <p className="mt-1 text-xs text-gray-500">{stats.examsPublished} published to class workflows</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-700">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-500">Documents</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{stats.documentsTotal}</p>
            <p className="mt-1 text-xs text-gray-500">{stats.documentsReady} indexed and ready for AI</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-700">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-500">Total Exam Questions</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{stats.totalQuestions}</p>
            <p className="mt-1 text-xs text-gray-500">Question bank currently generated by AI</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Lesson Activity</h3>
            <p className="mt-1 text-sm text-gray-500">Latest generated lessons in your workspace</p>
          </div>
          <Link href="/school-admin/lessons" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            View all
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {stats.recentLessons.length === 0 ? (
            <p className="text-sm text-gray-500">No lessons generated yet.</p>
          ) : (
            stats.recentLessons.map((lesson) => (
              <div key={lesson.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{lesson.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(lesson.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <Link href={`/school-admin/lessons/${lesson.id}`} className="text-sm font-medium text-gray-700 hover:text-gray-900">
                  Open
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
              <p className="mt-1 text-sm text-gray-500">Admin-only user management snapshot</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {stats.recentUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No users yet.</p>
            ) : (
              stats.recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{u.email}</p>
                    <p className="text-xs text-gray-500">{u.role}</p>
                  </div>
                  <Link href={`/school-admin/users/${u.id}`} className="text-sm font-medium text-gray-700 hover:text-gray-900">
                    View
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
