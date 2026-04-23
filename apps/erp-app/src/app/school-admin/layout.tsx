import { createClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { SchoolAdminLayoutClient } from './school-admin-layout-client'

const navigation = [
  { name: 'Dashboard', href: '/school-admin', icon: 'LayoutDashboard' },
  { name: 'Users', href: '/school-admin/users', icon: 'Users' },
  { name: 'Classes', href: '/school-admin/classes', icon: 'BookOpen' },
  { name: 'Organization', href: '/school-admin/settings?tab=organization', icon: 'Building2' },
  { name: 'Reports', href: '/school-admin/reports', icon: 'BarChart3' },
  { name: 'Settings', href: '/school-admin/settings', icon: 'Settings' },
]

export default async function SchoolAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations(id, name, slug, type)
    `)
    .eq('user_id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/auth/access-denied')
  }

  const organization = Array.isArray(profile?.organizations)
    ? profile?.organizations[0]
    : profile?.organizations

  const displayProfile = profile || {
    full_name: user.email?.split('@')[0] || 'Admin',
    email: user.email,
  }

  const organizationName = organization?.name || 'My School'

  const logo = (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600">
        <GraduationCap className="h-5 w-5 text-white" />
      </div>
      <div>
        <span className="text-lg font-bold text-gray-900">Eduator</span>
        <span className="ml-1 rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">School Admin</span>
      </div>
    </div>
  )

  const headerContent = (
    <div>
      <p className="truncate text-sm font-medium text-gray-900">{organizationName}</p>
      <p className="text-xs text-gray-500">School Admin Panel</p>
    </div>
  )

  const userSection = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-700">
        <span className="text-sm font-medium">
          {displayProfile.full_name?.charAt(0).toUpperCase() || 'A'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">
          {displayProfile.full_name || 'Admin'}
        </p>
        <p className="truncate text-xs text-gray-500">School Admin</p>
      </div>
    </div>
  )

  return (
    <SchoolAdminLayoutClient
      navigation={navigation}
      logo={logo}
      userSection={userSection}
      headerContent={headerContent}
      profile={displayProfile}
    >
      {children}
    </SchoolAdminLayoutClient>
  )
}
