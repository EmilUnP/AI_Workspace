import { createHash, randomBytes } from 'crypto'
import { getDbClient } from '../client'

const API_KEY_PREFIX = 'edsk_'
const KEY_BYTES = 32
const PREFIX_DISPLAY_LENGTH = 8 // chars after "edsk_" to show, e.g. edsk_ab12cd34

export interface TeacherApiKeyRow {
  id: string
  profile_id: string
  name: string
  key_prefix: string
  key_hash: string
  created_at: string
  last_used_at: string | null
}

export interface CreateTeacherApiKeyResult {
  key: string
  row: TeacherApiKeyRow
}

/**
 * Hash a raw API key for storage (never store raw key).
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey, 'utf8').digest('hex')
}

/**
 * Generate a new API key: random bytes, prefix, return full key and store hash.
 */
export function generateRawKey(): string {
  return API_KEY_PREFIX + randomBytes(KEY_BYTES).toString('hex')
}

/**
 * Get display prefix for a key (e.g. edsk_ab12cd34).
 */
export function keyPrefixForDisplay(fullKey: string): string {
  if (!fullKey.startsWith(API_KEY_PREFIX)) return fullKey.slice(0, PREFIX_DISPLAY_LENGTH + API_KEY_PREFIX.length)
  return fullKey.slice(0, API_KEY_PREFIX.length + PREFIX_DISPLAY_LENGTH)
}

export const teacherApiKeyRepository = {
  /**
   * Create a new API key for a teacher. Returns the full key ONCE; caller must show/copy to user.
   */
  async create(profileId: string, name: string): Promise<CreateTeacherApiKeyResult | null> {
    const supabase = getDbClient()
    const rawKey = generateRawKey()
    const keyHash = hashApiKey(rawKey)
    const keyPrefix = keyPrefixForDisplay(rawKey)

    const { data, error } = await supabase
      .from('teacher_api_keys')
      .insert({
        profile_id: profileId,
        name: name.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating teacher API key:', error)
      return null
    }

    return { key: rawKey, row: data as TeacherApiKeyRow }
  },

  /**
   * List all API keys for a teacher profile.
   */
  async listByProfile(profileId: string): Promise<TeacherApiKeyRow[]> {
    const supabase = getDbClient()

    const { data, error } = await supabase
      .from('teacher_api_keys')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error listing teacher API keys:', error)
      return []
    }

    return (data ?? []) as TeacherApiKeyRow[]
  },

  /**
   * Find profile and key id by API key (for auth). Updates last_used_at.
   */
  async getProfileIdByKey(rawKey: string): Promise<{ profileId: string; keyId: string } | null> {
    const supabase = getDbClient()
    const keyHash = hashApiKey(rawKey)

    const { data, error } = await supabase
      .from('teacher_api_keys')
      .select('id, profile_id')
      .eq('key_hash', keyHash)
      .single()

    if (error || !data) return null

    const row = data as { id: string; profile_id: string }

    await supabase
      .from('teacher_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', row.id)

    return { profileId: row.profile_id, keyId: row.id }
  },

  /**
   * Record a usage event (success or error) for analytics.
   */
  async recordUsage(params: {
    apiKeyId: string
    method: string
    endpoint: string
    status: 'success' | 'error'
    statusCode?: number
  }): Promise<void> {
    const supabase = getDbClient()
    await supabase.from('teacher_api_key_usage').insert({
      api_key_id: params.apiKeyId,
      method: params.method,
      endpoint: params.endpoint,
      status: params.status,
      status_code: params.statusCode,
    })
  },

  /**
   * Get usage stats for a teacher profile (all their keys).
   */
  async getUsageStats(profileId: string): Promise<{
    totalRequests: number
    successCount: number
    errorCount: number
    byKey: Array<{ keyId: string; keyName: string; keyPrefix: string; total: number; success: number; error: number }>
    byEndpoint: Array<{ method: string; endpoint: string; total: number; success: number; error: number }>
    recent: Array<{ method: string; endpoint: string; status: string; statusCode: number | null; createdAt: string }>
  }> {
    const supabase = getDbClient()

    const keys = await this.listByProfile(profileId)
    const keyIds = keys.map((k) => k.id)
    if (keyIds.length === 0) {
      return {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        byKey: [],
        byEndpoint: [],
        recent: [],
      }
    }

    const { data: usageRows } = await supabase
      .from('teacher_api_key_usage')
      .select('api_key_id, method, endpoint, status, status_code, created_at')
      .in('api_key_id', keyIds)
      .order('created_at', { ascending: false })

    const rows = (usageRows ?? []) as Array<{
      api_key_id: string
      method: string
      endpoint: string
      status: string
      status_code: number | null
      created_at: string
    }>

    const totalRequests = rows.length
    const successCount = rows.filter((r) => r.status === 'success').length
    const errorCount = rows.filter((r) => r.status === 'error').length

    const byKeyMap = new Map<string, { total: number; success: number; error: number }>()
    for (const k of keys) {
      byKeyMap.set(k.id, { total: 0, success: 0, error: 0 })
    }
    for (const r of rows) {
      const cur = byKeyMap.get(r.api_key_id)
      if (cur) {
        cur.total += 1
        if (r.status === 'success') cur.success += 1
        else cur.error += 1
      }
    }

    const byEndpointMap = new Map<string, { total: number; success: number; error: number }>()
    for (const r of rows) {
      const key = `${r.method} ${r.endpoint}`
      let cur = byEndpointMap.get(key)
      if (!cur) {
        cur = { total: 0, success: 0, error: 0 }
        byEndpointMap.set(key, cur)
      }
      cur.total += 1
      if (r.status === 'success') cur.success += 1
      else cur.error += 1
    }

    const byKey = keys.map((k) => {
      const s = byKeyMap.get(k.id) ?? { total: 0, success: 0, error: 0 }
      return {
        keyId: k.id,
        keyName: k.name,
        keyPrefix: k.key_prefix,
        total: s.total,
        success: s.success,
        error: s.error,
      }
    })

    const byEndpoint = Array.from(byEndpointMap.entries()).map(([key, s]) => {
      const [method, endpoint] = key.split(' ', 2)
      return { method, endpoint, total: s.total, success: s.success, error: s.error }
    })

    const recent = rows.slice(0, 50).map((r) => ({
      method: r.method,
      endpoint: r.endpoint,
      status: r.status,
      statusCode: r.status_code,
      createdAt: r.created_at,
    }))

    return {
      totalRequests,
      successCount,
      errorCount,
      byKey,
      byEndpoint,
      recent,
    }
  },

  /**
   * Revoke (delete) an API key. Caller must verify profile_id matches.
   */
  async revoke(id: string, profileId: string): Promise<boolean> {
    const supabase = getDbClient()

    const { error } = await supabase
      .from('teacher_api_keys')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId)

    if (error) {
      console.error('Error revoking teacher API key:', error)
      return false
    }

    return true
  },
}
