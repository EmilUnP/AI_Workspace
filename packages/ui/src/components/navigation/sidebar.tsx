'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '../../lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  BarChart3,
  PlusCircle,
} from 'lucide-react'

export interface SidebarItem {
  title: string
  href: string
  icon: React.ReactNode
  badge?: string | number
}

export interface SidebarSection {
  title?: string
  items: SidebarItem[]
}

export interface SidebarProps {
  sections: SidebarSection[]
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  logoHref?: string
  className?: string
}

export function Sidebar({
  sections,
  collapsed = false,
  onCollapsedChange,
  logoHref = '/',
  className,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
        <Link href={logoHref} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-gray-900">Eduator</span>
          )}
        </Link>
        {onCollapsedChange && (
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            {section.title && !collapsed && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-green-50 text-green-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <span className={cn(isActive && 'text-green-600')}>
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <Settings className="h-5 w-5" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  )
}

/**
 * Pre-configured sidebar items for different user roles
 */
export const platformOwnerSidebarItems: SidebarSection[] = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', href: '/platform-owner', icon: <LayoutDashboard className="h-5 w-5" /> },
      { title: 'Analytics', href: '/platform-owner/analytics', icon: <BarChart3 className="h-5 w-5" /> },
    ],
  },
  {
    title: 'Management',
    items: [
      { title: 'Users', href: '/platform-owner/users', icon: <Users className="h-5 w-5" /> },
    ],
  },
]

export const schoolAdminSidebarItems: SidebarSection[] = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', href: '/school-admin', icon: <LayoutDashboard className="h-5 w-5" /> },
      { title: 'Reports', href: '/school-admin/reports', icon: <BarChart3 className="h-5 w-5" /> },
    ],
  },
  {
    title: 'Management',
    items: [
      { title: 'Teachers', href: '/school-admin/teachers', icon: <Users className="h-5 w-5" /> },
      { title: 'Students', href: '/school-admin/students', icon: <Users className="h-5 w-5" /> },
    ],
  },
]

export const teacherSidebarItems: SidebarSection[] = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', href: '/teacher', icon: <LayoutDashboard className="h-5 w-5" /> },
    ],
  },
  {
    title: 'Teaching',
    items: [
      { title: 'Exams', href: '/teacher/exams', icon: <FileText className="h-5 w-5" /> },
      { title: 'Create Exam', href: '/teacher/exams/create', icon: <PlusCircle className="h-5 w-5" /> },
    ],
  },
]

