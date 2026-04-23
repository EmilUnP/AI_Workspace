'use client'

import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  EyeOff,
  GraduationCap,
  GripVertical,
  School,
} from 'lucide-react'
import {
  FEATURE_VISIBILITY_DEFINITIONS,
  getDefaultSortOrder,
  type FeatureAppSource,
  type FeatureRole,
} from '@eduator/core/utils'
import { updateFeatureOrderBulk, updateFeatureParent, updateFeatureVisibility } from './actions'

interface FeatureVisibilityClientProps {
  enabledByKey: Record<string, boolean>
  sortOrderByKey: Record<string, number>
  parentByKey: Record<string, string | null>
}

export function FeatureVisibilityClient({ enabledByKey, sortOrderByKey, parentByKey }: FeatureVisibilityClientProps) {
  const [state, setState] = useState<Record<string, boolean>>(enabledByKey)
  const [orderState, setOrderState] = useState<Record<string, number>>(sortOrderByKey)
  const [parentState, setParentState] = useState<Record<string, string | null>>(parentByKey)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [draggedFeatureKey, setDraggedFeatureKey] = useState<string | null>(null)
  const [dragOverFeatureKey, setDragOverFeatureKey] = useState<string | null>(null)

  const grouped = useMemo(() => {
    return {
      erp: {
        teacher: FEATURE_VISIBILITY_DEFINITIONS.filter((d) => d.appSource === 'erp' && d.role === 'teacher'),
      },
    }
  }, [])

  const makeCompoundKey = (app: FeatureAppSource, role: FeatureRole, key: string) => `${app}:${role}:${key}`

  const getEnabled = (app: FeatureAppSource, role: FeatureRole, key: string): boolean => {
    return state[makeCompoundKey(app, role, key)] ?? true
  }
  const getSortOrder = (app: FeatureAppSource, role: FeatureRole, key: string): number => {
    return (
      orderState[makeCompoundKey(app, role, key)] ?? getDefaultSortOrder(app, role, key)
    )
  }
  const getParentKey = (app: FeatureAppSource, role: FeatureRole, key: string): string | null => {
    const compound = makeCompoundKey(app, role, key)
    if (compound in parentState) return parentState[compound]
    return null
  }

  const handleToggle = async (
    appSource: FeatureAppSource,
    role: FeatureRole,
    featureKey: string,
    current: boolean
  ) => {
    setSavingKey(makeCompoundKey(appSource, role, featureKey))
    setMessage(null)

    const result = await updateFeatureVisibility({
      appSource,
      role,
      featureKey,
      enabled: !current,
    })

    setSavingKey(null)
    if (result.error) {
      setMessage(result.error)
      return
    }

    setState((prev) => ({
      ...prev,
      [makeCompoundKey(appSource, role, featureKey)]: !current,
    }))
  }

  const getRoleStats = (app: FeatureAppSource, role: FeatureRole) => {
    const list = grouped[app][role]
    const total = list.length
    const enabled = list.filter((item) => getEnabled(app, role, item.key)).length
    return { total, enabled, hidden: total - enabled }
  }

  const persistOrder = async (app: FeatureAppSource, role: FeatureRole, featuresInOrder: string[]) => {
    const result = await updateFeatureOrderBulk({
      appSource: app,
      role,
      orderedFeatureKeys: featuresInOrder,
    })
    return result.error ?? null
  }

  const reorderFeature = async (
    app: FeatureAppSource,
    role: FeatureRole,
    sourceKey: string,
    targetKey: string
  ) => {
    const list = [...grouped[app][role]].sort(
      (a, b) => getSortOrder(app, role, a.key) - getSortOrder(app, role, b.key)
    )
    const sourceIndex = list.findIndex((x) => x.key === sourceKey)
    const targetIndex = list.findIndex((x) => x.key === targetKey)
    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return

    const [moved] = list.splice(sourceIndex, 1)
    list.splice(targetIndex, 0, moved)
    const orderKeys = list.map((x) => x.key)
    const localMap: Record<string, number> = {}
    orderKeys.forEach((k, i) => {
      localMap[makeCompoundKey(app, role, k)] = i
    })
    setOrderState((prev) => ({ ...prev, ...localMap }))

    setSavingKey(makeCompoundKey(app, role, sourceKey))
    const error = await persistOrder(app, role, orderKeys)
    setSavingKey(null)
    if (error) setMessage(error)
  }

  const handleParentChange = async (
    app: FeatureAppSource,
    role: FeatureRole,
    featureKey: string,
    parentFeatureKey: string | null
  ) => {
    setSavingKey(makeCompoundKey(app, role, featureKey))
    const result = await updateFeatureParent({
      appSource: app,
      role,
      featureKey,
      parentFeatureKey,
    })
    setSavingKey(null)
    if (result.error) {
      setMessage(result.error)
      return
    }
    setParentState((prev) => ({
      ...prev,
      [makeCompoundKey(app, role, featureKey)]: parentFeatureKey,
    }))
  }

  const renderRoleSection = (app: FeatureAppSource, role: FeatureRole, title: string) => {
    const list = [...grouped[app][role]].sort(
      (a, b) => getSortOrder(app, role, a.key) - getSortOrder(app, role, b.key)
    )
    const labelByKey = Object.fromEntries(list.map((x) => [x.key, x.label]))
    const stats = getRoleStats(app, role)
    return (
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
            {stats.enabled}/{stats.total} visible
          </div>
        </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b border-gray-100 p-4 sm:p-5">
          <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-center">
            <p className="text-[11px] text-gray-500">Total</p>
            <p className="text-sm font-semibold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-center">
            <p className="text-[11px] text-emerald-700">Visible</p>
            <p className="text-sm font-semibold text-emerald-700">{stats.enabled}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-center">
            <p className="text-[11px] text-red-700">Hidden</p>
            <p className="text-sm font-semibold text-red-700">{stats.hidden}</p>
          </div>
        </div>

        <div className="space-y-0">
          {list.map((item, index) => {
            const enabled = getEnabled(app, role, item.key)
            const compoundKey = makeCompoundKey(app, role, item.key)
            const isSaving = savingKey === compoundKey
            const disabled = !!item.core
            const effectiveParentKey = getParentKey(app, role, item.key)
            const parentLabel = effectiveParentKey ? labelByKey[effectiveParentKey] ?? effectiveParentKey : null
            const position = index + 1
            const groupOptions = list
              .filter((x) => x.key !== item.key)
              .filter((x) => {
                const parentOfCandidate = getParentKey(app, role, x.key)
                return !parentOfCandidate
              })
              .map((x) => ({ key: x.key, label: x.label }))

            return (
              <div
                key={compoundKey}
                className={`flex items-center justify-between gap-3 border-t px-4 py-3 transition-colors sm:px-5 ${
                  dragOverFeatureKey === item.key
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-100 hover:bg-gray-50'
                }`}
                draggable={!isSaving}
                onDragStart={() => {
                  setDraggedFeatureKey(item.key)
                  setMessage(null)
                }}
                onDragEnd={() => {
                  setDraggedFeatureKey(null)
                  setDragOverFeatureKey(null)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverFeatureKey(item.key)
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  if (!draggedFeatureKey || draggedFeatureKey === item.key) return
                  await reorderFeature(app, role, draggedFeatureKey, item.key)
                  setDraggedFeatureKey(null)
                  setDragOverFeatureKey(null)
                }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-gray-300" />
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  </div>
                  <p className="text-xs text-gray-500">{item.navHref}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      Position #{position}
                    </span>
                    {parentLabel ? (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                        Group: {parentLabel}
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Top-level item
                      </span>
                    )}
                  </div>
                  {!disabled && (
                    <div className="mt-2">
                      <select
                        value={effectiveParentKey ?? ''}
                        onChange={(e) =>
                          handleParentChange(
                            app,
                            role,
                            item.key,
                            e.target.value === '' ? null : e.target.value
                          )
                        }
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
                        disabled={isSaving}
                      >
                        <option value="">Top-level</option>
                        {groupOptions.map((group) => (
                          <option key={group.key} value={group.key}>
                            Inside: {group.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSaving || disabled}
                    onClick={() => handleToggle(app, role, item.key, enabled)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                      disabled
                        ? 'bg-gray-200 text-gray-600'
                        : enabled
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-700'
                    }`}
                    title={disabled ? 'Core feature cannot be disabled' : undefined}
                  >
                    {disabled ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Always on
                      </>
                    ) : isSaving ? (
                      'Saving...'
                    ) : enabled ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        Hidden
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-3">
        <div className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white">
          <School className="h-4 w-4" />
          ERP
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600">
        Tip: Drag and drop rows to reorder sidebar positions. Core items stay always enabled for safety.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {renderRoleSection('erp', 'teacher', 'Teacher (ERP)')}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Changes apply immediately. Hidden pages are removed from navigation and blocked on direct URL access.
      </div>
    </div>
  )
}

