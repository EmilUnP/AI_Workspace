import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface DashboardStatCardProps {
  href?: string
  label: string
  value: number
  subtitle?: string
  icon: LucideIcon
  iconBgColor: string
  iconColor: string
  borderHoverColor: string
  bgHoverColor: string
}

export function DashboardStatCard({
  href,
  label,
  value,
  subtitle,
  icon: Icon,
  iconBgColor,
  iconColor,
  borderHoverColor,
  bgHoverColor
}: DashboardStatCardProps) {
  const hoverBorderClass = href ? `hover:border-${borderHoverColor}` : ''
  const hoverBgClass = bgHoverColor.replace('-50', '-100')
  
  const content = (
    <div className={`group relative overflow-hidden rounded-lg sm:rounded-xl lg:rounded-2xl bg-white p-3 sm:p-4 lg:p-5 shadow-sm border border-gray-100 hover:shadow-lg transition-all ${hoverBorderClass}`}>
      <div className={`absolute top-0 right-0 h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 translate-x-6 -translate-y-6 sm:translate-x-8 sm:-translate-y-8 rounded-full ${bgHoverColor} transition-colors group-hover:${hoverBgClass}`} />
      <div className="relative flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{label}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-green-600 font-medium mt-0.5 hidden sm:block">{subtitle}</p>
          )}
        </div>
        <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl flex-shrink-0 ml-2 ${iconBgColor} ${iconColor} group-hover:scale-110 transition-transform`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href}>
        {content}
      </Link>
    )
  }

  return content
}
