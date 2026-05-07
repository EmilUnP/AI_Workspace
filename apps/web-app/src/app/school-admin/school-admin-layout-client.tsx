'use client'

import { useState } from 'react'
import { GraduationCap, PanelLeftClose, PanelLeft } from 'lucide-react'
import { UserNav } from './user-nav'
import { MobileSidebar, DesktopNavigation } from '../components/mobile-sidebar'

interface NavItem {
  name: string
  href: string
  icon: string
  parent?: string
}

interface SchoolAdminLayoutClientProps {
  navigation: NavItem[]
  logo: React.ReactNode
  profile: { full_name?: string | null; email?: string | null }
  children: React.ReactNode
}

export function SchoolAdminLayoutClient({
  navigation,
  logo,
  profile,
  children,
}: SchoolAdminLayoutClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const displayProfile = {
    full_name: profile?.full_name || profile?.email?.split('@')[0] || 'Admin',
    email: profile?.email ?? '',
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar - collapsed = icon strip, expanded = full */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden bg-white border-r border-gray-200 transition-all duration-200 ease-in-out lg:block ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`flex h-full flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          {/* Logo */}
          <div
            className={`flex h-16 items-center border-b border-gray-200 ${
              sidebarCollapsed ? 'justify-center px-0' : 'gap-2 px-6'
            }`}
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-900">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <span className="text-lg font-bold text-gray-900">Eduator</span>
              </div>
            )}
          </div>

          <DesktopNavigation navigation={navigation} accentColor="blue" collapsed={sidebarCollapsed} />
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`flex flex-1 flex-col transition-[padding] duration-200 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        }`}
      >
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <MobileSidebar
              navigation={navigation}
              logo={logo}
              accentColor="blue"
            />

            {/* Desktop: collapse/expand sidebar button */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="hidden items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:inline-flex"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>

            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Eduator</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <UserNav profile={displayProfile} />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>

    </div>
  )
}
