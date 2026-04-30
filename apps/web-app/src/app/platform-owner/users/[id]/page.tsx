import { listUsers } from '@/lib/backend-auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Mail,
  Calendar,
  Shield,
  Users,
} from 'lucide-react'

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

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const users = await listUsers({ limit: 500, offset: 0 })
  const user = users.find((u) => u.id === id) ?? null

  if (!user) {
    notFound()
  }

  const role = roleConfig[user.role] || roleConfig.user

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/platform-owner/users"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Users
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Initial badge */}
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${role.bgColor} ${role.color}`}>
            <span className="text-2xl font-bold">
              {user.full_name?.charAt(0).toUpperCase() || '?'}
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
                {role.label}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          User editing/approval actions are disabled in clean-backend mode.
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-1">
        {/* User Info */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900">User Information</h2>
            
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">User ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{user.id}</dd>
              </div>
              
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Auth ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono truncate">{user.id}</dd>
              </div>
              
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</dt>
                <dd className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {new Date(user.created_at || Date.now()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
              
              {user.updated_at ? (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(user.updated_at).toLocaleDateString('en-US', {
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
