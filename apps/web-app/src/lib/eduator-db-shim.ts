export type TeacherApiKeyRow = {
  id: string
  name: string
  prefix: string
  key_prefix: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

const keys: TeacherApiKeyRow[] = []

export const teacherApiKeyRepository = {
  async create(_profileId: string, name: string) {
    const id = crypto.randomUUID()
    const key = `ed_${crypto.randomUUID().replace(/-/g, '')}`
    const row: TeacherApiKeyRow = {
      id,
      name,
      prefix: key.slice(0, 10),
      key_prefix: key.slice(0, 10),
      is_active: true,
      created_at: new Date().toISOString(),
      last_used_at: null,
    }
    keys.unshift(row)
    return { key, row }
  },
  async revoke(keyId: string, _profileId: string) {
    const item = keys.find((k) => k.id === keyId)
    if (!item) return false
    item.is_active = false
    return true
  },
  async listByProfile(_profileId: string) {
    return keys
  },
  async getUsageStats(_profileId: string) {
    return {
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      byKey: [],
      byEndpoint: [],
      recent: [],
    }
  },
}
