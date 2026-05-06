import { getCurrentUser } from '@/lib/backend-auth'
import { redirect } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { SchoolAdminLayoutClient } from './school-admin-layout-client'

const baseNavigation = [
  { name: 'Dashboard', href: '/school-admin', icon: 'LayoutDashboard' },
  { name: 'Documents', href: '/school-admin/documents', icon: 'FolderOpen' },
  { name: 'Exams', href: '/school-admin/exams', icon: 'FileText' },
  { name: 'Lessons', href: '/school-admin/lessons', icon: 'GraduationCap' },
  { name: 'Education Plans', href: '/school-admin/education-plans', icon: 'CalendarRange' },
  { name: 'AI Tutor', href: '/school-admin/chat', icon: 'MessageSquare' },
  { name: 'Tokens', href: '/school-admin/tokens', icon: 'Coins' },
]

export default async function SchoolAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (user.role !== 'operator' && user.role !== 'admin') redirect('/app')
  const navigation = user.role === 'admin'
    ? [{ name: 'Users', href: '/school-admin/users', icon: 'Users' }, ...baseNavigation]
    : baseNavigation

  const displayProfile = {
    full_name: user.email?.split('@')[0] || 'Operator',
    email: user.email,
  }

  const workspaceName = 'Global Workspace'

  const logo = (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600">
        <GraduationCap className="h-5 w-5 text-white" />
      </div>
      <div>
        <span className="text-lg font-bold text-gray-900">Eduator</span>
      </div>
    </div>
  )

  return (
    <SchoolAdminLayoutClient
      navigation={navigation}
      logo={logo}
      profile={displayProfile}
    >
      {children}
    </SchoolAdminLayoutClient>
  )
}
