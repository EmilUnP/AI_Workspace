import { ReactNode } from 'react'

interface DashboardHeaderProps {
  greeting: string
  name: string
  badge?: {
    label: string
    icon?: ReactNode
  }
  organizationName?: string
  quickActions?: ReactNode
  variant?: 'erp'
}

export function DashboardHeader({
  greeting,
  name,
  badge,
  organizationName,
  quickActions,
  variant = 'erp'
}: DashboardHeaderProps) {
  const gradientClasses = variant === 'erp'
    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600'
    : 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600'
  
  const greetingColor = variant === 'erp' ? 'text-blue-100' : 'text-violet-100'
  const badgeColor = variant === 'erp' ? 'text-blue-200' : 'text-violet-200'

  return (
    <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl ${gradientClasses} p-4 sm:p-6 lg:p-8 text-white`}>
      <div className="absolute top-0 right-0 -mt-16 -mr-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      
      <div className={`relative ${quickActions ? 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4' : ''}`}>
        <div>
          <p className={`${greetingColor} text-xs sm:text-sm font-medium`}>{greeting}</p>
          <h1 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-bold">{name || 'Teacher'}</h1>
          {organizationName && (
            <p className={`mt-2 ${badgeColor} flex items-center gap-2`}>
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
                {organizationName}
              </span>
            </p>
          )}
          {!organizationName && badge && (
            <p className={`mt-2 ${badgeColor} flex items-center gap-2`}>
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
                {badge.icon}
                {badge.label}
              </span>
            </p>
          )}
        </div>
        {quickActions && (
          <div className="flex flex-wrap gap-2">
            {quickActions}
          </div>
        )}
      </div>
    </div>
  )
}
