export type FeatureAppSource = 'erp'
export type FeatureRole = 'teacher'

export interface FeatureVisibilityDefinition {
  key: string
  label: string
  appSource: FeatureAppSource
  role: FeatureRole
  navHref: string
  routePrefixes: string[]
  parentKey?: string
  core?: boolean
}

export const FEATURE_VISIBILITY_DEFINITIONS: FeatureVisibilityDefinition[] = [
  // ERP teacher
  { key: 'dashboard', label: 'Dashboard', appSource: 'erp', role: 'teacher', navHref: '/teacher', routePrefixes: ['/teacher'], core: true },
  { key: 'teaching_studio', label: 'Teaching Studio', appSource: 'erp', role: 'teacher', navHref: '/teacher/teaching-studio', routePrefixes: ['/teacher/teaching-studio'] },
  { key: 'documents', label: 'Documents', appSource: 'erp', role: 'teacher', navHref: '/teacher/documents', routePrefixes: ['/teacher/documents'], parentKey: 'teaching_studio' },
  { key: 'exams', label: 'Exams', appSource: 'erp', role: 'teacher', navHref: '/teacher/exams', routePrefixes: ['/teacher/exams'], parentKey: 'teaching_studio' },
  { key: 'lessons', label: 'Lessons', appSource: 'erp', role: 'teacher', navHref: '/teacher/lessons', routePrefixes: ['/teacher/lessons'], parentKey: 'teaching_studio' },
  { key: 'courses', label: 'Courses', appSource: 'erp', role: 'teacher', navHref: '/teacher/courses', routePrefixes: ['/teacher/courses'], parentKey: 'teaching_studio' },
  { key: 'ai_tutor', label: 'AI Tutor', appSource: 'erp', role: 'teacher', navHref: '/teacher/chat', routePrefixes: ['/teacher/chat'], parentKey: 'teaching_studio' },
  { key: 'calendar', label: 'Calendar', appSource: 'erp', role: 'teacher', navHref: '/teacher/calendar', routePrefixes: ['/teacher/calendar'] },
  { key: 'classes', label: 'Classes', appSource: 'erp', role: 'teacher', navHref: '/teacher/classes', routePrefixes: ['/teacher/classes'] },
  { key: 'education_plans', label: 'Education Plans', appSource: 'erp', role: 'teacher', navHref: '/teacher/education-plans', routePrefixes: ['/teacher/education-plans'] },
  { key: 'reports', label: 'Reports', appSource: 'erp', role: 'teacher', navHref: '/teacher/reports', routePrefixes: ['/teacher/reports'] },
  { key: 'tokens', label: 'Tokens', appSource: 'erp', role: 'teacher', navHref: '/teacher/tokens', routePrefixes: ['/teacher/tokens'] },
  { key: 'api_integration', label: 'API Integration', appSource: 'erp', role: 'teacher', navHref: '/teacher/api-integration', routePrefixes: ['/teacher/api-integration'] },
  { key: 'settings', label: 'Settings', appSource: 'erp', role: 'teacher', navHref: '/teacher/settings', routePrefixes: ['/teacher/settings'], core: true },

]

export function getDefinitionsForRole(appSource: FeatureAppSource, role: FeatureRole): FeatureVisibilityDefinition[] {
  return FEATURE_VISIBILITY_DEFINITIONS.filter((d) => d.appSource === appSource && d.role === role)
}

export function getDefaultSortOrder(appSource: FeatureAppSource, role: FeatureRole, featureKey: string): number {
  const list = getDefinitionsForRole(appSource, role)
  const index = list.findIndex((d) => d.key === featureKey)
  return index === -1 ? 9999 : index
}

export function getFeatureByNavHref(appSource: FeatureAppSource, role: FeatureRole, href: string): FeatureVisibilityDefinition | null {
  return getDefinitionsForRole(appSource, role).find((d) => d.navHref === href) ?? null
}

export function getFeatureByPathname(appSource: FeatureAppSource, role: FeatureRole, pathname: string): FeatureVisibilityDefinition | null {
  return (
    getDefinitionsForRole(appSource, role).find((d) =>
      d.routePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))
    ) ?? null
  )
}

export function isFeatureEnabled(
  appSource: FeatureAppSource,
  role: FeatureRole,
  featureKey: string,
  enabledByFeatureKey: Record<string, boolean>
): boolean {
  const definition = getDefinitionsForRole(appSource, role).find((d) => d.key === featureKey)
  if (!definition) return true
  if (definition.core) return true
  return enabledByFeatureKey[featureKey] ?? true
}

export function isPathEnabled(
  appSource: FeatureAppSource,
  role: FeatureRole,
  pathname: string,
  enabledByFeatureKey: Record<string, boolean>
): boolean {
  const definition = getFeatureByPathname(appSource, role, pathname)
  if (!definition || definition.core) return true
  return enabledByFeatureKey[definition.key] ?? true
}

export function sortNavigationByFeatureOrder<T extends { href: string }>(
  appSource: FeatureAppSource,
  role: FeatureRole,
  items: T[],
  sortOrderByFeatureKey: Record<string, number>,
  parentByFeatureKey?: Record<string, string | null>
): T[] {
  const withFeature = items.map((item) => ({
    item,
    feature: getFeatureByNavHref(appSource, role, item.href),
  }))

  const getOrder = (featureKey?: string) =>
    featureKey ? (sortOrderByFeatureKey[featureKey] ?? getDefaultSortOrder(appSource, role, featureKey)) : 9998

  const topLevel = withFeature
    .filter((x) => {
      const parentKey = x.feature?.key ? (parentByFeatureKey?.[x.feature.key] ?? null) : null
      return !parentKey
    })
    .sort((a, b) => getOrder(a.feature?.key) - getOrder(b.feature?.key))

  const childrenByParent = new Map<string, typeof withFeature>()
  for (const entry of withFeature) {
    const parentKey = entry.feature?.key ? (parentByFeatureKey?.[entry.feature.key] ?? null) : null
    if (!parentKey) continue
    if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, [])
    childrenByParent.get(parentKey)!.push(entry)
  }

  for (const [parentKey, list] of childrenByParent.entries()) {
    list.sort((a, b) => getOrder(a.feature?.key) - getOrder(b.feature?.key))
    childrenByParent.set(parentKey, list)
  }

  const result: T[] = []
  const consumedChildKeys = new Set<string>()

  for (const top of topLevel) {
    result.push(top.item)
    const topKey = top.feature?.key
    if (!topKey) continue

    const children = childrenByParent.get(topKey) ?? []
    for (const child of children) {
      result.push(child.item)
      if (child.feature) consumedChildKeys.add(child.feature.key)
    }
  }

  const orphans = withFeature
    .filter((x) => {
      if (!x.feature) return false
      const parentKey = parentByFeatureKey?.[x.feature.key] ?? null
      return !!parentKey && !consumedChildKeys.has(x.feature.key)
    })
    .sort((a, b) => getOrder(a.feature?.key) - getOrder(b.feature?.key))
  for (const orphan of orphans) result.push(orphan.item)

  return result
}

