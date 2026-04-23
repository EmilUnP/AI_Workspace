import { getSessionWithProfile } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { GraduationCap, Bell } from 'lucide-react'
import { UserNav } from '../platform-owner/user-nav'
import { MobileSidebar, DesktopNavigation } from '../components/mobile-sidebar'
import { StudentAssistantFabWrapper } from './student-assistant-fab-wrapper'
import { LocaleSwitcher } from '../components/locale-switcher'
import { getTranslations, getMessages } from 'next-intl/server'
import { featureVisibilityRepository } from '@eduator/db/repositories'
import { getFeatureByNavHref, isFeatureEnabled, sortNavigationByFeatureOrder } from '@eduator/core/utils'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionWithProfile()
  if (!session?.user) redirect('/auth/login')

  const [nav, tAssistant, messages] = await Promise.all([
    getTranslations('studentNav'),
    getTranslations('studentAssistant'),
    getMessages(),
  ])
  const msg = (messages?.studentAssistant as Record<string, string> | undefined) ?? {}
  const assistantLabels = {
    openAssistant: tAssistant('openAssistant'),
    openStudyAssistant: tAssistant('openStudyAssistant'),
    studyAssistant: tAssistant('studyAssistant'),
    close: tAssistant('close'),
    failedToLoad: tAssistant('failedToLoad'),
    invalidResponse: tAssistant('invalidResponse'),
    invalidResponseFromServer: tAssistant('invalidResponseFromServer'),
    somethingWentWrong: tAssistant('somethingWentWrong'),
    yourStudyAssistant: tAssistant('yourStudyAssistant'),
    heroSubtitle: tAssistant('heroSubtitle'),
    yourAssistant: tAssistant('yourAssistant'),
    examsLessonsProgress: tAssistant('examsLessonsProgress'),
    stepToday: tAssistant('stepToday'),
    stepExams: tAssistant('stepExams'),
    stepLessons: tAssistant('stepLessons'),
    stepUpdates: tAssistant('stepUpdates'),
    stepProgress: tAssistant('stepProgress'),
    nudgeNoActivity: tAssistant('nudgeNoActivity'),
    todayTitle: tAssistant('todayTitle'),
    todayDescription: tAssistant('todayDescription'),
    lessons: tAssistant('lessons'),
    completedToday: msg.completedToday ?? '{count} completed today',
    noneCompletedToday: tAssistant('noneCompletedToday'),
    exams: tAssistant('exams'),
    takenToday: msg.takenToday ?? '{count} taken today',
    noneTakenToday: tAssistant('noneTakenToday'),
    youHaveUpcoming: msg.youHaveUpcoming ?? 'You have {exams} upcoming exam(s) and {lessons} lesson(s) available. A short session can keep you on track.',
    upcomingExams: tAssistant('upcomingExams'),
    upcomingExamsDescription: tAssistant('upcomingExamsDescription'),
    viewAll: tAssistant('viewAll'),
    min: tAssistant('min'),
    noUpcomingExams: tAssistant('noUpcomingExams'),
    checkBackLater: tAssistant('checkBackLater'),
    lessonsDescription: tAssistant('lessonsDescription'),
    class: tAssistant('class'),
    noLessonsYet: tAssistant('noLessonsYet'),
    lessonsAppearWhenAssigned: tAssistant('lessonsAppearWhenAssigned'),
    classUpdates: tAssistant('classUpdates'),
    classUpdatesDescription: tAssistant('classUpdatesDescription'),
    newInClass: msg.newInClass ?? 'New {type} in {class} · {date}',
    newUpdate: msg.newUpdate ?? 'New {type} · {date}',
    typeLesson: tAssistant('typeLesson'),
    typeExam: tAssistant('typeExam'),
    open: tAssistant('open'),
    noNewUpdates: tAssistant('noNewUpdates'),
    allCaughtUp: tAssistant('allCaughtUp'),
    myProgressScores: tAssistant('myProgressScores'),
    progressDescription: tAssistant('progressDescription'),
    fullReport: tAssistant('fullReport'),
    studyPulse: tAssistant('studyPulse'),
    studyPulseDescription: tAssistant('studyPulseDescription'),
    minTotal: msg.minTotal ?? '{minutes} min total',
    taken: tAssistant('taken'),
    averageScore: tAssistant('averageScore'),
    noExamsYet: tAssistant('noExamsYet'),
    takeOneToSeeScore: tAssistant('takeOneToSeeScore'),
    dayStreak: msg.dayStreak ?? '{count} day streak',
    achievements: tAssistant('achievements'),
    firstLesson: tAssistant('firstLesson'),
    fiveLessons: tAssistant('fiveLessons'),
    firstExam: tAssistant('firstExam'),
    average80: tAssistant('average80'),
    completeForBadge: tAssistant('completeForBadge'),
    askMeAnything: tAssistant('askMeAnything'),
    examsLessonsProgressShort: tAssistant('examsLessonsProgressShort'),
    iHaveYourSchedule: tAssistant('iHaveYourSchedule'),
    promptFocusToday: tAssistant('promptFocusToday'),
    promptUpcomingExams: tAssistant('promptUpcomingExams'),
    promptMyProgress: tAssistant('promptMyProgress'),
    promptDidLessonOrExam: tAssistant('promptDidLessonOrExam'),
    placeholderQuestion: tAssistant('placeholderQuestion'),
    requestFailed: tAssistant('requestFailed'),
    requestFailedTryAgain: tAssistant('requestFailedTryAgain'),
    useTabsAbove: tAssistant('useTabsAbove'),
  }
  const rawNavigation = [
    { name: nav('dashboard'), href: '/student', icon: 'LayoutDashboard' },
    { name: nav('calendar'), href: '/student/calendar', icon: 'Calendar' },
    { name: nav('myClasses'), href: '/student/classes', icon: 'BookOpen' },
    { name: nav('exams'), href: '/student/exams', icon: 'FileText' },
    { name: nav('lessons'), href: '/student/lessons', icon: 'BookOpen' },
    { name: nav('aiTutor'), href: '/student/chat', icon: 'MessageSquare' },
    { name: nav('myProgress'), href: '/student/progress', icon: 'BarChart3' },
    { name: nav('settings'), href: '/student/settings', icon: 'Settings' },
  ]
  const enabledMap = await featureVisibilityRepository.getEnabledMap('erp', 'student')
  const sortOrderMap = await featureVisibilityRepository.getSortOrderMap('erp', 'student')
  const parentMap = await featureVisibilityRepository.getParentMap('erp', 'student')
  const filteredNavigation = rawNavigation.filter((item) => {
    const feature = getFeatureByNavHref('erp', 'student', item.href)
    if (!feature) return true
    return isFeatureEnabled('erp', 'student', feature.key, enabledMap)
  })
  const navigation = sortNavigationByFeatureOrder(
    'erp',
    'student',
    filteredNavigation,
    sortOrderMap,
    parentMap
  )
  const parentLabelByKey = Object.fromEntries(
    navigation
      .map((item) => {
        const feature = getFeatureByNavHref('erp', 'student', item.href)
        return feature ? [feature.key, item.name] : null
      })
      .filter(Boolean) as [string, string][]
  )
  const navigationWithDynamicParent = navigation.map((item) => {
    const feature = getFeatureByNavHref('erp', 'student', item.href)
    if (!feature) return item
    const dynamicParentKey = parentMap[feature.key] ?? null
    return {
      ...item,
      parent: dynamicParentKey ? parentLabelByKey[dynamicParentKey] : undefined,
    }
  })

  const { user, profile } = session

  if (profile && !profile.organization_id) redirect('/auth/access-denied')
  
  // Fallback profile for display
  const displayProfile = profile || {
    full_name: user.email?.split('@')[0] || 'Student',
    email: user.email ?? '',
  }

  // Logo component for mobile sidebar
  const logo = (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600">
        <GraduationCap className="h-5 w-5 text-white" />
      </div>
      <div>
        <span className="text-lg font-bold text-gray-900">Eduator</span>
        <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">Student</span>
      </div>
    </div>
  )

  // User section for mobile sidebar
  const userSection = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700">
        <span className="text-sm font-medium">
          {displayProfile.full_name?.charAt(0).toUpperCase() || 'S'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">
          {displayProfile.full_name || 'Student'}
        </p>
        <p className="truncate text-xs text-gray-500">{nav('enterpriseAccount')}</p>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 bg-white shadow-lg lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">Eduator</span>
              <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">Student</span>
            </div>
          </div>

          {/* Navigation with active state */}
          <DesktopNavigation navigation={navigationWithDynamicParent} accentColor="green" />

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            {userSection}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <MobileSidebar 
              navigation={navigationWithDynamicParent}
              logo={logo}
              userSection={userSection}
              accentColor="green"
            />
            
            {/* Mobile logo - shown only on mobile */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Eduator</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <LocaleSwitcher accent="green" />
            <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-green-500" />
            </button>
            <UserNav profile={displayProfile} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>

        {/* Floating assistant icon — click to open assistant in a drawer */}
        <StudentAssistantFabWrapper
          dataApiPath="/student/assistant/api"
          assistantActionPath="/student/assistant/action"
          variant="erp"
          labels={assistantLabels}
        />
      </div>
    </div>
  )
}
