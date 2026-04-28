'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { createClient } from '@eduator/auth/supabase/client'
import { use } from 'react'
import type { OrganizationType, SubscriptionPlan, OrganizationStatus } from '@eduator/config'

interface OrganizationFormData {
  id: string
  name: string
  slug: string
  type: OrganizationType
  email: string
  phone: string | null
  website: string | null
  subscription_plan: SubscriptionPlan
  status: OrganizationStatus
}

interface OrganizationRow {
  id: string
  name: string
  slug: string
  type: string
  email: string
  phone: string | null
  website: string | null
  subscription_plan: string
  status: string
}

export default function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState<OrganizationFormData>({
    id: '',
    name: '',
    slug: '',
    type: 'school',
    email: '',
    phone: null,
    website: null,
    subscription_plan: 'basic',
    status: 'active',
  })

  useEffect(() => {
    async function fetchOrganization() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, type, email, phone, website, subscription_plan, status')
        .eq('id', id)
        .single<OrganizationRow>()

      if (error || !data) {
        setError('Organization not found')
        setFetching(false)
        return
      }

      setFormData({
        id: data.id,
        name: data.name,
        slug: data.slug,
        type: data.type as OrganizationType,
        email: data.email,
        phone: data.phone ?? null,
        website: data.website ?? null,
        subscription_plan: data.subscription_plan as SubscriptionPlan,
        status: data.status as OrganizationStatus,
      })
      setFetching(false)
    }

    fetchOrganization()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      
      const updateData = {
        name: formData.name,
        type: formData.type,
        email: formData.email,
        phone: formData.phone || null,
        website: formData.website || null,
        subscription_plan: formData.subscription_plan,
        status: formData.status,
      }

      // Supabase client types may not include organizations table; cast payload for .update()
      const { error: updateError } = await supabase
        .from('organizations')
        .update(updateData as never)
        .eq('id', id)

      if (updateError) {
        setError(updateError.message)
        return
      }

      router.push(`/platform-owner/organizations/${id}`)
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error updating organization:', err)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/platform-owner/organizations/${id}`}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Organization</h1>
          <p className="mt-1 text-gray-500">{formData.name}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Organization Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                required
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as OrganizationType }))}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="school">School</option>
                <option value="university">University</option>
                <option value="institution">Institution</option>
                <option value="academy">Academy</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                required
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as OrganizationStatus }))}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label htmlFor="subscription_plan" className="block text-sm font-medium text-gray-700">
                Subscription Plan <span className="text-red-500">*</span>
              </label>
              <select
                id="subscription_plan"
                required
                value={formData.subscription_plan}
                onChange={(e) => setFormData(prev => ({ ...prev, subscription_plan: e.target.value as SubscriptionPlan }))}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value || null }))}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                Website
              </label>
              <input
                id="website"
                type="url"
                value={formData.website || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value || null }))}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/platform-owner/organizations/${id}`}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
