import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'

export default async function DeleteLessonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const token = (await cookies()).get('access_token')?.value
  if (!id || !token) {
    redirect('/school-admin/lessons')
  }

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'
  await fetch(`${backendBase}/v1/lessons/${id}`, {
    method: 'DELETE',
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })

  redirect('/school-admin/lessons')
}
