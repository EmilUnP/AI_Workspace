'use client'

import { useState, useTransition } from 'react'
import { Building2, Save, AlertCircle, CheckCircle, Link as LinkIcon } from 'lucide-react'
import { updateOrganization } from './actions'

interface Organization {
  id: string
  name: string
  slug: string
  type: string
  email: string
  phone?: string | null
  website?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  subscription_plan: string
  status: string
}

export function OrganizationForm({ organization }: { organization: Organization }) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [slug, setSlug] = useState(organization.slug)

  // Get base URL dynamically (localhost in dev, eduator.ai in prod)
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${window.location.protocol}//${hostname}:${window.location.port}`
      }
      return `https://eduator.ai`
    }
    return 'https://eduator.ai'
  }

  const baseUrl = getBaseUrl()

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const result = await updateOrganization(formData)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Organization updated successfully!' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Organization Settings</h3>
          <p className="text-sm text-gray-500">Manage your organization&apos;s public information</p>
        </div>
      </div>

      {message && (
        <div className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-sm ${
          message.type === 'error' 
            ? 'bg-red-50 text-red-700' 
            : 'bg-green-50 text-green-700'
        }`}>
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {/* Organization Info Banner */}
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
          <div>
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${
              organization.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {organization.status}
            </span>
            <span className="ml-2 inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium capitalize text-blue-700">
              {organization.subscription_plan}
            </span>
          </div>
          <span className="text-xs text-gray-500 capitalize">{organization.type}</span>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Organization Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={organization.name}
            onChange={(e) => setSlug(generateSlug(e.target.value))}
            className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* URL Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
            URL Slug <span className="text-red-500">*</span>
          </label>
          <div className="mt-1.5 flex rounded-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <span className="flex items-center border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
              <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
              {baseUrl}/org/
            </span>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 border-0 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-0"
              placeholder="my-school"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Only lowercase letters, numbers, and hyphens. This is your organization&apos;s unique URL.
            {slug && (
              <span className="ml-2">
                <a 
                  href={`${baseUrl}/org/${slug}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:text-orange-700 hover:underline"
                >
                  View public page →
                </a>
              </span>
            )}
          </p>
        </div>

        {/* Email & Phone */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={organization.email}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={organization.phone || ''}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700">
            Website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            defaultValue={organization.website || ''}
            placeholder="https://www.yourschool.edu"
            className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Street Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            defaultValue={organization.address || ''}
            className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* City & Country */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              defaultValue={organization.city || ''}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              id="country"
              name="country"
              type="text"
              defaultValue={organization.country || ''}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
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
      </div>
    </form>
  )
}
