import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Eye, ShieldCheck, Sparkles } from 'lucide-react'
import { getSessionWithProfile } from '@eduator/auth/supabase/server'
import {
  FEATURE_VISIBILITY_DEFINITIONS,
  type FeatureAppSource,
  type FeatureRole,
} from '@eduator/core/utils'
import { featureVisibilityRepository } from '@eduator/db/repositories'
import { FeatureVisibilityClient } from './feature-visibility-client'

export default async function FeatureVisibilityPage() {
  const session = await getSessionWithProfile()
  if (!session?.user || session.profile?.profile_type !== 'platform_owner') {
    redirect('/auth/access-denied')
  }

  await featureVisibilityRepository.ensureDefaults()

  const combinations: { app: FeatureAppSource; role: FeatureRole }[] = [
    { app: 'erp', role: 'teacher' },
  ]

  const maps = await Promise.all(
    combinations.map(async (combination) => ({
      ...combination,
      enabledMap: await featureVisibilityRepository.getEnabledMap(combination.app, combination.role),
      sortOrderMap: await featureVisibilityRepository.getSortOrderMap(combination.app, combination.role),
      parentMap: await featureVisibilityRepository.getParentMap(combination.app, combination.role),
    }))
  )

  const enabledByKey: Record<string, boolean> = {}
  const sortOrderByKey: Record<string, number> = {}
  const parentByKey: Record<string, string | null> = {}
  for (const item of maps) {
    for (const definition of FEATURE_VISIBILITY_DEFINITIONS.filter(
      (d) => d.appSource === item.app && d.role === item.role
    )) {
      enabledByKey[`${item.app}:${item.role}:${definition.key}`] =
        item.enabledMap[definition.key] ?? true
      sortOrderByKey[`${item.app}:${item.role}:${definition.key}`] =
        item.sortOrderMap[definition.key] ?? 9999
      parentByKey[`${item.app}:${item.role}:${definition.key}`] =
        item.parentMap[definition.key] ?? null
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <nav className="mb-2 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/platform-owner" className="hover:text-gray-700">
            Dashboard
          </Link>
          <span>/</span>
          <span className="font-medium text-gray-900">Feature visibility</span>
        </nav>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          <Eye className="h-7 w-7 text-red-500" />
          Feature visibility control
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">
          Control which pages are visible for Teachers in ERP. Hidden pages are
          removed from navigation and blocked on direct URL access.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
              <ShieldCheck className="h-4 w-4" />
              Secure route blocking
            </div>
            <p className="mt-1 text-xs text-blue-700">
              Disabled pages are blocked even on direct URL access.
            </p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm font-medium text-violet-800">
              <Sparkles className="h-4 w-4" />
              No code redeploy needed
            </div>
            <p className="mt-1 text-xs text-violet-700">
              Toggle visibility live from this panel whenever needed.
            </p>
          </div>
        </div>
      </div>

      <FeatureVisibilityClient
        enabledByKey={enabledByKey}
        sortOrderByKey={sortOrderByKey}
        parentByKey={parentByKey}
      />
    </div>
  )
}

