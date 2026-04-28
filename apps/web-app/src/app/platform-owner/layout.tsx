import { getSessionWithProfile } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { PlatformOwnerLayoutClient } from './platform-owner-layout-client'

const navigation = [
  { name: 'Dashboard', href: '/platform-owner', icon: 'LayoutDashboard' },
  { name: 'Users', href: '/platform-owner/users', icon: 'Users' },
  { name: 'Usage & payments', href: '/platform-owner/usage-payments', icon: 'Activity' },
  { name: 'Real token usage', href: '/platform-owner/real-token-usage', icon: 'BarChart3' },
  { name: 'Token settings', href: '/platform-owner/token-settings', icon: 'Coins' },
  { name: 'Reports', href: '/platform-owner/reports', icon: 'BarChart3' },
]

export default async function PlatformOwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionWithProfile()
  if (!session?.user) redirect('/auth/login')

  const { user, profile } = session

  const displayProfile = profile || {
    full_name: user.email?.split('@')[0] || 'Admin',
    email: user.email,
  }

  const logo = (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600">
        <GraduationCap className="h-5 w-5 text-white" />
      </div>
      <div>
        <span className="text-lg font-bold text-gray-900">Eduator</span>
        <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">Platform Owner</span>
      </div>
    </div>
  )

  const userSection = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700">
        <span className="text-sm font-medium">
          {displayProfile.full_name?.charAt(0).toUpperCase() || 'A'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">
          {displayProfile.full_name || 'Admin'}
        </p>
        <p className="truncate text-xs text-gray-500">Platform Owner</p>
      </div>
    </div>
  )

  return (
    <PlatformOwnerLayoutClient
      navigation={navigation}
      logo={logo}
      userSection={userSection}
      profile={displayProfile}
    >
      {children}
    </PlatformOwnerLayoutClient>
  )
}
