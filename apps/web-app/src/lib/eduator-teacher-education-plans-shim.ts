type InsertArgs = {
  organization_id: string
  teacher_id: string
  name: string
  description: string | null
  period_months: number
  sessions_per_week: number
  hours_per_session: number
  audience: string | null
  document_ids: string[]
  content: unknown
}

export async function insertEducationPlan(_supabase: unknown, payload: InsertArgs) {
  return {
    data: {
      id: crypto.randomUUID(),
      ...payload,
      created_at: new Date().toISOString(),
    },
    error: null,
  }
}
