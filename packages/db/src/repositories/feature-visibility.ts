import { getDbClient } from '../client'
import {
  FEATURE_VISIBILITY_DEFINITIONS,
  getDefaultSortOrder,
  getDefinitionsForRole,
  type FeatureAppSource,
  type FeatureRole,
} from '@eduator/core/utils'

interface FeatureVisibilityRuleRow {
  app_source: FeatureAppSource
  role: FeatureRole
  feature_key: string
  enabled: boolean
  sort_order: number
  parent_feature_key: string | null
}

export const featureVisibilityRepository = {
  async ensureDefaults(): Promise<void> {
    const supabase = getDbClient()
    const rows = FEATURE_VISIBILITY_DEFINITIONS.map((d) => ({
      app_source: d.appSource,
      role: d.role,
      feature_key: d.key,
      enabled: true,
      sort_order: getDefaultSortOrder(d.appSource, d.role, d.key),
      parent_feature_key: null,
    }))

    const { error } = await supabase
      .from('feature_visibility_rules')
      .upsert(rows, { onConflict: 'app_source,role,feature_key', ignoreDuplicates: true })

    if (error) {
      console.error('Error ensuring feature visibility defaults:', error)
    }
  },

  async getRules(appSource: FeatureAppSource, role: FeatureRole): Promise<FeatureVisibilityRuleRow[]> {
    const supabase = getDbClient()
    const { data, error } = await supabase
      .from('feature_visibility_rules')
      .select('app_source, role, feature_key, enabled, sort_order, parent_feature_key')
      .eq('app_source', appSource)
      .eq('role', role)

    if (error) {
      console.error('Error fetching feature visibility rules:', error)
      return []
    }

    return (data as FeatureVisibilityRuleRow[]) ?? []
  },

  async getEnabledMap(appSource: FeatureAppSource, role: FeatureRole): Promise<Record<string, boolean>> {
    await this.ensureDefaults()

    const definitions = getDefinitionsForRole(appSource, role)
    const fallback = Object.fromEntries(definitions.map((d) => [d.key, true]))
    const rules = await this.getRules(appSource, role)

    for (const rule of rules) {
      fallback[rule.feature_key] = rule.enabled
    }

    for (const definition of definitions) {
      if (definition.core) fallback[definition.key] = true
    }

    return fallback
  },

  async getSortOrderMap(appSource: FeatureAppSource, role: FeatureRole): Promise<Record<string, number>> {
    await this.ensureDefaults()
    const definitions = getDefinitionsForRole(appSource, role)
    const fallback = Object.fromEntries(
      definitions.map((d) => [d.key, getDefaultSortOrder(appSource, role, d.key)])
    )
    const rules = await this.getRules(appSource, role)

    for (const rule of rules) {
      fallback[rule.feature_key] = Number(rule.sort_order ?? fallback[rule.feature_key])
    }

    return fallback
  },

  async getParentMap(appSource: FeatureAppSource, role: FeatureRole): Promise<Record<string, string | null>> {
    await this.ensureDefaults()
    const definitions = getDefinitionsForRole(appSource, role)
    const fallback: Record<string, string | null> = Object.fromEntries(
      definitions.map((d) => [d.key, null])
    )
    const rules = await this.getRules(appSource, role)

    for (const rule of rules) {
      fallback[rule.feature_key] = rule.parent_feature_key ?? fallback[rule.feature_key] ?? null
    }
    return fallback
  },

  async setRule(input: {
    appSource: FeatureAppSource
    role: FeatureRole
    featureKey: string
    enabled: boolean
    updatedBy?: string | null
  }): Promise<boolean> {
    const definition = getDefinitionsForRole(input.appSource, input.role).find(
      (d) => d.key === input.featureKey
    )

    if (!definition) return false
    if (definition.core) return false

    const supabase = getDbClient()
    const { error } = await supabase.from('feature_visibility_rules').upsert(
      {
        app_source: input.appSource,
        role: input.role,
        feature_key: input.featureKey,
        enabled: input.enabled,
        sort_order: getDefaultSortOrder(input.appSource, input.role, input.featureKey),
        parent_feature_key: null,
        updated_by: input.updatedBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'app_source,role,feature_key' }
    )

    if (error) {
      console.error('Error updating feature visibility rule:', error)
      return false
    }

    return true
  },

  async setSortOrder(input: {
    appSource: FeatureAppSource
    role: FeatureRole
    featureKey: string
    sortOrder: number
    updatedBy?: string | null
  }): Promise<boolean> {
    const definition = getDefinitionsForRole(input.appSource, input.role).find(
      (d) => d.key === input.featureKey
    )
    if (!definition) return false

    const supabase = getDbClient()
    const { data: existing } = await supabase
      .from('feature_visibility_rules')
      .select('enabled, parent_feature_key')
      .eq('app_source', input.appSource)
      .eq('role', input.role)
      .eq('feature_key', input.featureKey)
      .maybeSingle()

    const { error } = await supabase.from('feature_visibility_rules').upsert(
      {
        app_source: input.appSource,
        role: input.role,
        feature_key: input.featureKey,
        enabled: (existing as { enabled?: boolean } | null)?.enabled ?? true,
        sort_order: input.sortOrder,
        parent_feature_key:
          (existing as { parent_feature_key?: string | null } | null)?.parent_feature_key ?? null,
        updated_by: input.updatedBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'app_source,role,feature_key' }
    )

    if (error) {
      console.error('Error updating feature sort order:', error)
      return false
    }

    return true
  },

  async setSortOrderBulk(input: {
    appSource: FeatureAppSource
    role: FeatureRole
    orderedFeatureKeys: string[]
    updatedBy?: string | null
  }): Promise<boolean> {
    const definitions = getDefinitionsForRole(input.appSource, input.role)
    const validKeys = new Set(definitions.map((d) => d.key))
    if (!input.orderedFeatureKeys.every((k) => validKeys.has(k))) return false

    const supabase = getDbClient()
    const existing = await this.getRules(input.appSource, input.role)
    const enabledMap = Object.fromEntries(existing.map((r) => [r.feature_key, r.enabled]))
    const parentMap = Object.fromEntries(existing.map((r) => [r.feature_key, r.parent_feature_key]))

    const rows = input.orderedFeatureKeys.map((featureKey, index) => ({
      app_source: input.appSource,
      role: input.role,
      feature_key: featureKey,
      enabled: enabledMap[featureKey] ?? true,
      sort_order: index,
      parent_feature_key: parentMap[featureKey] ?? null,
      updated_by: input.updatedBy ?? null,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('feature_visibility_rules')
      .upsert(rows, { onConflict: 'app_source,role,feature_key' })

    if (error) {
      console.error('Error bulk updating feature sort order:', error)
      return false
    }

    return true
  },

  async setParent(input: {
    appSource: FeatureAppSource
    role: FeatureRole
    featureKey: string
    parentFeatureKey: string | null
    updatedBy?: string | null
  }): Promise<boolean> {
    const definitions = getDefinitionsForRole(input.appSource, input.role)
    const definition = definitions.find((d) => d.key === input.featureKey)
    if (!definition) return false
    if (input.parentFeatureKey === input.featureKey) return false
    if (input.parentFeatureKey && !definitions.some((d) => d.key === input.parentFeatureKey)) return false

    const supabase = getDbClient()
    const { data: existing } = await supabase
      .from('feature_visibility_rules')
      .select('enabled, sort_order')
      .eq('app_source', input.appSource)
      .eq('role', input.role)
      .eq('feature_key', input.featureKey)
      .maybeSingle()

    const { error } = await supabase.from('feature_visibility_rules').upsert(
      {
        app_source: input.appSource,
        role: input.role,
        feature_key: input.featureKey,
        enabled: (existing as { enabled?: boolean } | null)?.enabled ?? true,
        sort_order:
          (existing as { sort_order?: number } | null)?.sort_order ??
          getDefaultSortOrder(input.appSource, input.role, input.featureKey),
        parent_feature_key: input.parentFeatureKey,
        updated_by: input.updatedBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'app_source,role,feature_key' }
    )

    if (error) {
      console.error('Error updating feature parent group:', error)
      return false
    }
    return true
  },
}

