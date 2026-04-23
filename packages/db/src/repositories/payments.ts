/**
 * Payments repository - platform owner views who paid what and when.
 */

import { getDbClient } from '../client'
import type { Payment } from '@eduator/core/types/token'

export interface PaymentWithProfile extends Payment {
  profile?: { id: string; full_name: string; email: string } | null
}

export type CreatePaymentInput = {
  profile_id: string | null
  organization_id?: string | null
  amount_cents: number
  currency?: string
  status: Payment['status']
  tokens_granted: number
  payment_method?: string | null
  external_id?: string | null
  paid_at?: string | null
  created_at?: string
}

export const paymentsRepository = {
  /**
   * Insert a single payment (e.g. for seeding or recording a purchase).
   */
  async createPayment(input: CreatePaymentInput): Promise<Payment | null> {
    const supabase = getDbClient()
    const row = {
      profile_id: input.profile_id,
      organization_id: input.organization_id ?? null,
      amount_cents: input.amount_cents,
      currency: input.currency ?? 'USD',
      status: input.status,
      tokens_granted: input.tokens_granted,
      payment_method: input.payment_method ?? null,
      external_id: input.external_id ?? null,
      paid_at: input.paid_at ?? null,
      ...(input.created_at && { created_at: input.created_at }),
    }
    const { data, error } = await supabase.from('payments').insert(row).select().single()
    if (error) {
      console.error('Error creating payment:', error)
      return null
    }
    return data as Payment
  },

  /**
   * List payments for platform owner (all or filtered).
   * Use since (ISO date string) to fetch payments from that date onward (e.g. for charts).
   */
  async getPaymentsAdmin(options: {
    profileId?: string
    status?: Payment['status']
    since?: string
    limit?: number
    offset?: number
  }): Promise<{ data: PaymentWithProfile[]; count: number }> {
    const supabase = getDbClient()
    let query = supabase
      .from('payments')
      .select(
        'id, profile_id, organization_id, amount_cents, currency, status, tokens_granted, payment_method, external_id, created_at, paid_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })

    if (options.profileId) query = query.eq('profile_id', options.profileId)
    if (options.status) query = query.eq('status', options.status)
    if (options.since) query = query.gte('created_at', options.since)
    query = query.range(
      options.offset ?? 0,
      (options.offset ?? 0) + (options.limit ?? 50) - 1
    )

    const { data: paymentsData, error: paymentsError, count } = await query

    if (paymentsError) {
      console.error('Error getting payments (admin):', paymentsError)
      return { data: [], count: 0 }
    }

    const payments = (paymentsData as Payment[]) ?? []
    if (payments.length === 0) {
      return { data: [], count: count ?? 0 }
    }

    const profileIds = [...new Set(payments.map((p) => p.profile_id).filter(Boolean))] as string[]
    const profilesMap = new Map<string, { id: string; full_name: string; email: string }>()

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', profileIds)
      if (profiles) {
        for (const p of profiles as { id: string; full_name: string; email: string }[]) {
          profilesMap.set(p.id, p)
        }
      }
    }

    const data: PaymentWithProfile[] = payments.map((p) => ({
      ...p,
      profile: p.profile_id ? profilesMap.get(p.profile_id) ?? null : null,
    }))

    return { data, count: count ?? 0 }
  },

  /**
   * Aggregate: total revenue (completed payments) and count. Platform owner.
   */
  async getPaymentsStatsAdmin(): Promise<{ totalRevenueCents: number; completedCount: number }> {
    const supabase = getDbClient()
    const { data, error } = await supabase
      .from('payments')
      .select('amount_cents, status')
      .eq('status', 'completed')

    if (error) {
      console.error('Error getting payments stats:', error)
      return { totalRevenueCents: 0, completedCount: 0 }
    }
    const rows = (data as { amount_cents: number; status: string }[]) ?? []
    return {
      totalRevenueCents: rows.reduce((sum, r) => sum + r.amount_cents, 0),
      completedCount: rows.length,
    }
  },
}
