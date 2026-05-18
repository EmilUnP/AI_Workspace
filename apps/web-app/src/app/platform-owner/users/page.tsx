import { listUsers } from '@/lib/backend-auth'
import { getApiUrl } from '@/lib/portal-urls'
import { Users, Shield } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

const getBackendBase = () => getApiUrl()

const buildRedirectUrl = (status: 'success' | 'error', message: string) => {
  const query = new URLSearchParams({ status, message })
  return `/platform-owner/users?${query.toString()}`
}

const createOperatorAction = async (formData: FormData) => {
  'use server'

  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '').trim()
  const manualNote = String(formData.get('manual_note') || '').trim()

  if (!email || !password) {
    redirect(buildRedirectUrl('error', 'Email and password are required.'))
  }

  if (password.length < 8) {
    redirect(buildRedirectUrl('error', 'Password must be at least 8 characters.'))
  }

  let response: Response
  try {
    response = await fetch(`${getApiUrl()}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        role: 'operator',
        manual_note: manualNote || undefined,
      }),
      cache: 'no-store',
    })

  } catch {
    redirect(buildRedirectUrl('error', 'Backend unavailable. Start backend and try again.'))
  }

  if (!response.ok) {
    let errorMessage = 'Failed to create operator.'
    try {
      const payload = (await response.json()) as { error?: string; message?: string }
      errorMessage = payload.error || payload.message || errorMessage
    } catch {
      // Keep generic fallback when response body is not JSON.
    }
    redirect(buildRedirectUrl('error', errorMessage))
  }

  redirect(buildRedirectUrl('success', 'Operator user created successfully.'))
}
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; message?: string }>
}) {
  const t = await getTranslations('platformOwner')
  const params = await searchParams
  const allUsers = await listUsers({ limit: 200, offset: 0 })
  const users = allUsers
  const stats = {
    total: allUsers.length,
    admins: allUsers.filter((u) => u.role === 'admin').length,
    operators: allUsers.filter((u) => u.role === 'operator').length,
    regular: allUsers.filter((u) => u.role === 'user').length,
  }
  const roleConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    admin: {
      icon: <Shield className="h-3.5 w-3.5" />,
      color: 'text-red-600',
      label: t('roleAdmin'),
    },
    operator: {
      icon: <Users className="h-3.5 w-3.5" />,
      color: 'text-blue-600',
      label: t('roleOperator'),
    },
    user: {
      icon: <Users className="h-3.5 w-3.5" />,
      color: 'text-gray-600',
      label: t('roleUser'),
    },
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('usersTitle')}</h1>
        </div>
        {/* Quick Stats */}
        <div className="hidden items-center gap-6 lg:flex">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{stats.admins}</p>
            <p className="text-xs text-gray-500">{t('roleAdmin')}</p>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.operators}</p>
            <p className="text-xs text-gray-500">{t('roleOperator')}</p>
          </div>
        </div>
      </div>

      <form action={createOperatorAction} className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-medium text-gray-500">{t('email')}</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-medium text-gray-500">{t('password')}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="manual_note" className="text-xs font-medium text-gray-500">{t('manualNote')}</label>
            <input
              id="manual_note"
              name="manual_note"
              type="text"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">{t('addOperator')}</button>
        </div>
      </form>

      {params.message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            params.status === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {params.message}
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">{t('noUsersFound')}</h3>
            <p className="mt-2 text-sm text-gray-500">{t('addFirstOperatorHint')}</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">
                  {t('email')}
                </th>
                <th scope="col" className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 md:table-cell">
                  {t('role')}
                </th>
                <th scope="col" className="hidden px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 lg:table-cell">
                  {t('manualNote')}
                </th>
                <th scope="col" className="relative py-3 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">{t('actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.map((user) => {
                const role = roleConfig[user.role] || roleConfig.user

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                      <Link
                        href={`/platform-owner/users/${user.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-gray-700 hover:underline"
                      >
                        {user.email}
                      </Link>
                    </td>

                    {/* Role */}
                    <td className="hidden whitespace-nowrap px-3 py-4 md:table-cell">
                      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${role.color}`}>
                        {role.icon}
                        {role.label}
                      </span>
                    </td>

                    <td className="hidden max-w-xs px-3 py-4 text-sm text-gray-600 lg:table-cell">
                      <span className="block truncate">{user.manual_note || '-'}</span>
                    </td>

                    <td className="whitespace-nowrap py-4 pl-3 pr-4 sm:pr-6">
                      <div className="flex items-center justify-end">
                        <Link
                          href={`/platform-owner/users/${user.id}`}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          {t('view')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
