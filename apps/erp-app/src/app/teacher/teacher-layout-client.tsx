'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, Bell, PanelLeftClose, PanelLeft, Coins } from 'lucide-react'
import { UserNav } from '../platform-owner/user-nav'
import { MobileSidebar, DesktopNavigation } from '../components/mobile-sidebar'
import { LocaleSwitcher } from '../components/locale-switcher'
import { useTranslations } from 'next-intl'

interface NavItem {
  name: string
  href: string
  icon: string
  parent?: string
}

interface TokenTransactionRow {
  id: string
  amount: number
  action_type: string
  created_at: string
}

interface TeacherLayoutClientProps {
  navigation: NavItem[]
  logo: React.ReactNode
  userSection: React.ReactNode
  profile: { full_name?: string | null; email?: string | null }
  tokenBalance?: number
  tokenTransactions?: TokenTransactionRow[]
  children: React.ReactNode
}

export function TeacherLayoutClient({
  navigation,
  logo,
  userSection,
  profile,
  tokenBalance = 0,
  tokenTransactions = [],
  children,
}: TeacherLayoutClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const t = useTranslations('teacherNav')

  const displayProfile = {
    full_name: profile?.full_name || profile?.email?.split('@')[0] || 'Teacher',
    email: profile?.email ?? '',
    avatar_url: (profile as { avatar_url?: string | null })?.avatar_url,
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar - collapsed = icon strip, expanded = full */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden bg-white shadow-lg transition-all duration-200 ease-in-out lg:block ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`flex h-full flex-col ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          {/* Logo */}
          <div className={`flex h-16 items-center border-b border-gray-200 ${sidebarCollapsed ? 'justify-center px-0' : 'gap-2 px-6'}`}>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <span className="text-lg font-bold text-gray-900">Eduator</span>
                <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                  Teacher
                </span>
              </div>
            )}
          </div>

          <DesktopNavigation navigation={navigation} accentColor="blue" collapsed={sidebarCollapsed} />

          {!sidebarCollapsed && (
            <div className="border-t border-gray-200 p-4">
              {userSection}
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`flex flex-1 flex-col transition-[padding] duration-200 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        }`}
      >
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-4">
            <MobileSidebar
              navigation={navigation}
              logo={logo}
              userSection={userSection}
              accentColor="blue"
            />

            {/* Desktop: collapse/expand sidebar button */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="hidden items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:inline-flex"
              aria-label={sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
              title={sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </button>

            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Eduator</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <LocaleSwitcher accent="green" />
            <Link
              href="/teacher/tokens"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              title={t('tokenBalanceTitle')}
            >
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="hidden sm:inline">{tokenBalance.toLocaleString()} {t('tokensUnit')}</span>
              <span className="sm:hidden">{tokenBalance}</span>
            </Link>
            <button
              type="button"
              className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <UserNav profile={displayProfile} />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
