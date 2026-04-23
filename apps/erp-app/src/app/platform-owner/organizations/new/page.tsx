'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { createClient } from '@eduator/auth/supabase/client'

type OrganizationType = 'school' | 'university' | 'institution' | 'academy' | 'other'
type SubscriptionPlan = 'basic' | 'premium' | 'enterprise'

export default function NewOrganizationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'school' as OrganizationType,
    email: '',
    phone: '',
    website: '',
    subscription_plan: 'basic' as SubscriptionPlan,
  })

  // Auto-generate slug from name (not user-editable in platform owner)
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Auto-generate slug from organization name
      const slug = generateSlug(formData.name)
      
      // Supabase client may not have generated types for organizations table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase.from('organizations') as any)
        .insert({
          name: formData.name,
          slug: slug,
          type: formData.type,
          email: formData.email,
          phone: formData.phone || null,
          website: formData.website || null,
          subscription_plan: formData.subscription_plan,
          status: 'active',
        })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          setError('An organization with this slug already exists')
        } else {
          setError(insertError.message)
        }
        return
      }

      router.push('/platform-owner/organizations')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error creating organization:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/platform-owner/organizations"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Organization</h1>
          <p className="mt-1 text-gray-500">
            Create a new organization on the platform
          </p>
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
          <p className="mt-1 text-sm text-gray-500">Essential details about the organization</p>

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
                placeholder="Springfield High School"
              />
              <p className="mt-1 text-xs text-gray-500">
                URL slug will be auto-generated. School admin can customize it later.
              </p>
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
                placeholder="contact@school.edu"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="+1 234 567 890"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                Website
              </label>
              <input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="https://www.school.edu"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/platform-owner/organizations"
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
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Organization
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
