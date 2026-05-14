import { getUserById } from '@/lib/backend-auth'
import { getAccessToken } from '@/lib/backend-auth'
import { webAppBackendAuthHeaders } from '@/lib/web-app-backend-headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Calendar,
  Shield,
  Users,
} from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'

const roleConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  admin: {
    icon: <Shield className="h-5 w-5" />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    label: 'Admin',
  },
  operator: {
    icon: <Users className="h-5 w-5" />,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    label: 'Operator',
  },
  user: {
    icon: <Users className="h-5 w-5" />,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    label: 'User',
  },
}

const getBackendBase = () => process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:4000'

const buildRedirectUrl = (id: string, status: 'success' | 'error', message: string) => {
  const query = new URLSearchParams({ status, message })
  return `/platform-owner/users/${id}?${query.toString()}`
}

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string; message?: string }>
}) {
  const t = await getTranslations('platformOwner')
  const locale = await getLocale()
  const { id } = await params
  const query = await searchParams
  const user = await getUserById(id)

  if (!user) {
    notFound()
  }

  const updatePasswordAction = async (formData: FormData) => {
    'use server'

    const password = String(formData.get('password') || '').trim()
    const accessToken = await getAccessToken()

    if (!password) {
      redirect(buildRedirectUrl(id, 'error', 'Password is required.'))
    }

    if (password.length < 8) {
      redirect(buildRedirectUrl(id, 'error', 'Password must be at least 8 characters.'))
    }

    if (!accessToken) {
      redirect(buildRedirectUrl(id, 'error', 'Session expired. Please login again.'))
    }

    try {
      const response = await fetch(`${getBackendBase()}/v1/users/${id}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...webAppBackendAuthHeaders(accessToken),
        },
        body: JSON.stringify({ password }),
        cache: 'no-store',
      })

      if (!response.ok) {
        let errorMessage = 'Failed to update password.'
        try {
          const payload = (await response.json()) as { error?: string; message?: string }
          errorMessage = payload.error || payload.message || errorMessage
        } catch {
          // keep fallback
        }
        redirect(buildRedirectUrl(id, 'error', errorMessage))
      }

      redirect(buildRedirectUrl(id, 'success', 'Password updated successfully.'))
    } catch {
      redirect(buildRedirectUrl(id, 'error', 'Backend unavailable. Start backend and try again.'))
    }
  }

  const role = roleConfig[user.role] || roleConfig.user
  const localizedRoleLabel =
    user.role === 'admin'
      ? t('roleAdmin')
      : user.role === 'operator'
        ? t('roleOperator')
        : t('roleUser')

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/platform-owner/users"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToUsers')}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Initial badge */}
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${role.bgColor} ${role.color}`}>
            <span className="text-2xl font-bold">
              {user.email?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.email}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {user.email}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${role.bgColor} ${role.color}`}>
                {role.icon}
                {localizedRoleLabel}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-1">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900">{t('updatePassword')}</h2>
          <form action={updatePasswordAction} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs font-medium text-gray-500">{t('newPassword')}</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
              {t('updatePasswordButton')}
            </button>
          </form>
          {query.message ? (
            <div
              className={`mt-3 rounded-md border px-3 py-2 text-sm ${
                query.status === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {query.message}
            </div>
          ) : null}
        </div>

        {/* User Info */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">{t('userInformation')}</h2>
            
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('userId')}</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{user.id}</dd>
              </div>
              
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('authId')}</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono truncate">{user.id}</dd>
              </div>
              
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('joined')}</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {new Date(user.created_at || Date.now()).toLocaleDateString(locale === 'az' ? 'az-AZ' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('manualNote')}</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.manual_note || '-'}</dd>
              </div>
              
              {user.updated_at ? (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('lastUpdated')}</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(user.updated_at).toLocaleDateString(locale === 'az' ? 'az-AZ' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
