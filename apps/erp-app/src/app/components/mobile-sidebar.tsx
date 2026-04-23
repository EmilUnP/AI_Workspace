'use client'

import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Building2, 
  Users, 
  User,
  Settings, 
  BarChart3,
  BookOpen,
  FileText,
  FileCheck,
  MessageSquare,
  GraduationCap,
  FolderOpen,
  Sparkles,
  Calendar,
  CalendarRange,
  Key,
  Coins,
  Activity,
  Eye,
  type LucideIcon
} from 'lucide-react'

// Icon mapping for navigation items
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  Users,
  User,
  Settings,
  BarChart3,
  BookOpen,
  FileText,
  FileCheck,
  MessageSquare,
  GraduationCap,
  FolderOpen,
  Sparkles,
  Calendar,
  CalendarRange,
  Key,
  Coins,
  Activity,
  Eye,
}

interface NavItem {
  name: string
  href: string
  icon: string // Icon name as string
  // Optional parent label to visually group items (e.g. children under "Teaching Studio")
  parent?: string
}

interface MobileSidebarProps {
  navigation: NavItem[]
  logo: React.ReactNode
  userSection: React.ReactNode
  headerContent?: React.ReactNode
  accentColor?: 'red' | 'orange' | 'blue' | 'green'
}

export function MobileSidebar({ 
  navigation, 
  logo, 
  userSection,
  headerContent,
  accentColor = 'blue' 
}: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Close sidebar when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const getActiveClasses = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-50 text-red-700 border-red-500'
      case 'orange':
        return 'bg-orange-50 text-orange-700 border-orange-500'
      case 'green':
        return 'bg-green-50 text-green-700 border-green-500'
      case 'blue':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-500'
    }
  }
  
  const activeClasses = getActiveClasses(accentColor || 'blue')

  const isActive = (href: string) => {
    // Parse href to separate path and query params
    const [hrefPath, hrefQuery] = href.split('?')
    const hrefPathNormalized = hrefPath.endsWith('/') && hrefPath !== '/' 
      ? hrefPath.slice(0, -1) 
      : hrefPath

    // Check exact path match first
    const pathnameNormalized = pathname.endsWith('/') && pathname !== '/' 
      ? pathname.slice(0, -1) 
      : pathname
    
    // For root paths, only match exactly
    if ((hrefPathNormalized === '/school-admin' || hrefPathNormalized === '/platform-owner') && pathnameNormalized !== hrefPathNormalized) {
      return false
    }
    
    // Check path match
    if (hrefPathNormalized === pathnameNormalized) {
      const hasCurrentQueryParams = searchParams.toString().length > 0
      
      // If href has query params, check if they match
      if (hrefQuery) {
        const hrefParams = new URLSearchParams(hrefQuery)
        let allParamsMatch = true
        hrefParams.forEach((value, key) => {
          if (searchParams.get(key) !== value) {
            allParamsMatch = false
          }
        })
        return allParamsMatch
      }
      
      // If href has no query params but current URL has query params, don't match
      // (e.g., Settings shouldn't be active when on Organization tab)
      if (!hrefQuery && hasCurrentQueryParams) {
        return false
      }
      
      return true
    }
    
    // Check for nested routes (e.g., /school-admin/users/123 matches /school-admin/users)
    // But exclude root paths from this check
    if (hrefPathNormalized !== '/' && hrefPathNormalized !== '/school-admin' && hrefPathNormalized !== '/platform-owner' && pathnameNormalized.startsWith(hrefPathNormalized + '/')) {
      return true
    }
    
    return false
  }

  return (
    <>
      {/* Mobile menu button - visible only on mobile */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="lg:hidden inline-flex items-center justify-center rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        aria-label="Open sidebar"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" />
          
          {/* Sidebar panel */}
          <div 
            className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full flex-col">
              {/* Header with close button */}
              <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
                {logo}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Optional header content (e.g., organization name) */}
              {headerContent && (
                <div className="border-b border-gray-200 px-4 py-3">
                  {headerContent}
                </div>
              )}

              {/* Navigation */}
              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {navigation.map((item) => {
                  const active = isActive(item.href)
                  const Icon = iconMap[item.icon]
                  const isChild = !!item.parent
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                        isChild ? 'pl-8 pr-3 text-gray-600' : 'px-3'
                      } ${
                        active
                          ? activeClasses + ' border-l-4'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent'
                      }`}
                    >
                      {Icon && (
                        <Icon
                          className={`h-5 w-5 ${isChild ? 'text-gray-400' : ''}`}
                        />
                      )}
                      {item.name}
                    </Link>
                  )
                })}
              </nav>

              {/* User section */}
              <div className="border-t border-gray-200 p-4">
                {userSection}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Desktop sidebar navigation with active state (optional icon-only collapsed mode)
export function DesktopNavigation({ 
  navigation, 
  accentColor = 'blue',
  collapsed = false
}: { 
  navigation: NavItem[]
  accentColor?: 'red' | 'orange' | 'blue' | 'green'
  collapsed?: boolean
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const getActiveClasses = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-50 text-red-700 border-l-4 border-red-500'
      case 'orange':
        return 'bg-orange-50 text-orange-700 border-l-4 border-orange-500'
      case 'green':
        return 'bg-green-50 text-green-700 border-l-4 border-green-500'
      case 'blue':
      default:
        return 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
    }
  }
  
  const activeClasses = getActiveClasses(accentColor || 'blue')

  const isActive = (href: string) => {
    // Parse href to separate path and query params
    const [hrefPath, hrefQuery] = href.split('?')
    const hrefPathNormalized = hrefPath.endsWith('/') && hrefPath !== '/' 
      ? hrefPath.slice(0, -1) 
      : hrefPath

    // Check exact path match first
    const pathnameNormalized = pathname.endsWith('/') && pathname !== '/' 
      ? pathname.slice(0, -1) 
      : pathname
    
    // For root paths, only match exactly
    if ((hrefPathNormalized === '/school-admin' || hrefPathNormalized === '/platform-owner') && pathnameNormalized !== hrefPathNormalized) {
      return false
    }
    
    // Check path match
    if (hrefPathNormalized === pathnameNormalized) {
      const hasCurrentQueryParams = searchParams.toString().length > 0
      
      // If href has query params, check if they match
      if (hrefQuery) {
        const hrefParams = new URLSearchParams(hrefQuery)
        let allParamsMatch = true
        hrefParams.forEach((value, key) => {
          if (searchParams.get(key) !== value) {
            allParamsMatch = false
          }
        })
        return allParamsMatch
      }
      
      // If href has no query params but current URL has query params, don't match
      // (e.g., Settings shouldn't be active when on Organization tab)
      if (!hrefQuery && hasCurrentQueryParams) {
        return false
      }
      
      return true
    }
    
    // Check for nested routes (e.g., /school-admin/users/123 matches /school-admin/users)
    // But exclude root paths from this check
    if (hrefPathNormalized !== '/' && hrefPathNormalized !== '/school-admin' && hrefPathNormalized !== '/platform-owner' && pathnameNormalized.startsWith(hrefPathNormalized + '/')) {
      return true
    }
    
    return false
  }

  if (collapsed) {
    return (
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const active = isActive(item.href)
          const Icon = iconMap[item.icon]
          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={`flex items-center justify-center rounded-lg p-2.5 transition-colors ${
                active ? activeClasses : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navigation.map((item) => {
        const active = isActive(item.href)
        const Icon = iconMap[item.icon]
        const isChild = !!item.parent
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              isChild ? 'pl-8 pr-3 text-gray-600' : 'px-3'
            } ${
              active
                ? activeClasses
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent'
            }`}
          >
            {Icon && (
              <Icon
                className={`h-5 w-5 ${isChild ? 'text-gray-400' : ''}`}
              />
            )}
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
