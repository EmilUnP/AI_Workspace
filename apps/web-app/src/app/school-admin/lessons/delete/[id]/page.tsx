import { redirect } from 'next/navigation'
import { getApiUrl } from '@/lib/portal-urls'
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

  const backendBase = getApiUrl()
  await fetch(`${backendBase}/v1/lessons/${id}`, {
    method: 'DELETE',
    headers: webAppBackendAuthHeaders(token),
    cache: 'no-store',
  })

  redirect('/school-admin/lessons')
}
