'use client'

import { cn } from '../../lib/utils'
import { Avatar } from '../ui/avatar'
import { Bell, Search, Menu } from 'lucide-react'

export interface NavbarProps {
  user?: {
    name: string
    email: string
    avatar?: string
  }
  onMenuClick?: () => void
  onUserClick?: () => void
  onNotificationsClick?: () => void
  notificationCount?: number
  className?: string
}

export function Navbar({
  user,
  onMenuClick,
  onUserClick,
  onNotificationsClick,
  notificationCount,
  className,
}: NavbarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Search */}
        <div className="hidden md:flex">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search..."
              className="h-10 w-64 rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        {onNotificationsClick && (
          <button
            onClick={onNotificationsClick}
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <Bell className="h-5 w-5" />
            {notificationCount && notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
        )}

        {/* User */}
        {user && (
          <button
            onClick={onUserClick}
            className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-gray-100"
          >
            <Avatar name={user.name} src={user.avatar} size="sm" />
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </button>
        )}
      </div>
    </header>
  )
}
