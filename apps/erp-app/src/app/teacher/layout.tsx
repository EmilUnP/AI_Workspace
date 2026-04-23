import { getSessionWithProfile } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { tokenRepository } from '@eduator/db/repositories/tokens'
import { featureVisibilityRepository } from '@eduator/db/repositories'
import { getFeatureByNavHref, isFeatureEnabled, sortNavigationByFeatureOrder } from '@eduator/core/utils'
import { TeacherLayoutClient } from './teacher-layout-client'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionWithProfile()
  if (!session?.user) redirect('/auth/login')

  const { user, profile } = session

  if (profile && !profile.organization_id) redirect('/auth/access-denied')

  const nav = await getTranslations('teacherNav')

  const baseNavigation = [
    { name: nav('dashboard'), href: '/teacher', icon: 'LayoutDashboard' },
    { name: nav('teachingStudio'), href: '/teacher/teaching-studio', icon: 'Sparkles' },
    { name: nav('documents'), href: '/teacher/documents', icon: 'FolderOpen' },
    { name: nav('exams'), href: '/teacher/exams', icon: 'FileText' },
    { name: nav('lessons'), href: '/teacher/lessons', icon: 'GraduationCap' },
    { name: nav('courses'), href: '/teacher/courses', icon: 'Sparkles' },
    { name: nav('aiTutor'), href: '/teacher/chat', icon: 'MessageSquare' },
    { name: nav('calendar'), href: '/teacher/calendar', icon: 'Calendar' },
    { name: nav('classes'), href: '/teacher/classes', icon: 'BookOpen' },
    { name: nav('educationPlans'), href: '/teacher/education-plans', icon: 'CalendarRange' },
    { name: nav('reports'), href: '/teacher/reports', icon: 'BarChart3' },
    { name: nav('tokens'), href: '/teacher/tokens', icon: 'Coins' },
    { name: nav('settings'), href: '/teacher/settings', icon: 'Settings' },
  ]

  const displayProfile = profile || {
    full_name: user.email?.split('@')[0] || 'Teacher',
    email: user.email,
  }

  const profileId = profile?.id ?? null
  const [tokenBalance, tokenTransactions] = profileId
    ? await Promise.all([
        tokenRepository.getBalance(profileId),
        tokenRepository.getTransactions(profileId, 10),
      ])
    : [0, []]

  const apiIntegrationEnabled = !!(
    profile?.metadata &&
    typeof profile.metadata === 'object' &&
    (profile.metadata as { api_integration_enabled?: boolean }).api_integration_enabled
  )
  const navigationWithApiToggle = apiIntegrationEnabled
    ? [
        ...baseNavigation.slice(0, -1),
        { name: nav('apiIntegration'), href: '/teacher/api-integration', icon: 'Key' },
        ...baseNavigation.slice(-1),
      ]
    : baseNavigation

  const enabledMap = await featureVisibilityRepository.getEnabledMap('erp', 'teacher')
  const sortOrderMap = await featureVisibilityRepository.getSortOrderMap('erp', 'teacher')
  const parentMap = await featureVisibilityRepository.getParentMap('erp', 'teacher')
  const filteredNavigation = navigationWithApiToggle.filter((item) => {
    const feature = getFeatureByNavHref('erp', 'teacher', item.href)
    if (!feature) return true
    return isFeatureEnabled('erp', 'teacher', feature.key, enabledMap)
  })
  const navigation = sortNavigationByFeatureOrder(
    'erp',
    'teacher',
    filteredNavigation,
    sortOrderMap,
    parentMap
  )
  const parentLabelByKey = Object.fromEntries(
    navigation
      .map((item) => {
        const feature = getFeatureByNavHref('erp', 'teacher', item.href)
        return feature ? [feature.key, item.name] : null
      })
      .filter(Boolean) as [string, string][]
  )
  const navigationWithDynamicParent = navigation.map((item) => {
    const feature = getFeatureByNavHref('erp', 'teacher', item.href)
    if (!feature) return item
    const dynamicParentKey = parentMap[feature.key] ?? null
    return {
      ...item,
      parent: dynamicParentKey ? parentLabelByKey[dynamicParentKey] : undefined,
    }
  })

  // Logo component for mobile sidebar
  const logo = (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
        <GraduationCap className="h-5 w-5 text-white" />
      </div>
      <div>
        <span className="text-lg font-bold text-gray-900">Eduator</span>
        <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">Teacher</span>
      </div>
    </div>
  )

  // User section for mobile sidebar
  const userSection = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
        <span className="text-sm font-medium">
          {displayProfile.full_name?.charAt(0).toUpperCase() || 'T'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">
          {displayProfile.full_name || 'Teacher'}
        </p>
        <p className="truncate text-xs text-gray-500">{nav('enterpriseAccount')}</p>
      </div>
    </div>
  )

  return (
    <TeacherLayoutClient
      navigation={navigationWithDynamicParent}
      logo={logo}
      userSection={userSection}
      profile={displayProfile}
      tokenBalance={tokenBalance}
      tokenTransactions={tokenTransactions}
    >
      {children}
    </TeacherLayoutClient>
  )
}
