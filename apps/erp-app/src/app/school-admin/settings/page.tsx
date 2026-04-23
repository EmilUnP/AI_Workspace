'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Settings, 
  Lock,
  Building2,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  Globe,
  ImageIcon
} from 'lucide-react'
import { createClient } from '@eduator/auth/supabase/client'
import { updateOrganization, updateOrganizationStructure, updateOrganizationPublicPage } from './actions'

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
  logo_url?: string | null
  subscription_plan: string
  status: string
  settings?: {
    structure?: OrganizationUnit[]
    public_page?: {
      hero_image_url?: string | null
      gallery_image_urls?: string[]
      tagline?: string | null
      about_html?: string | null
    }
    [key: string]: unknown
  } | null
}

interface OrganizationUnit {
  id: string
  name: string
  description?: string
  parent_id?: string | null
}

type Tab = 'password' | 'organization' | 'structure' | 'public-page'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as Tab | null
  const [activeTab, setActiveTab] = useState<Tab>(tabParam && ['password', 'organization', 'structure', 'public-page'].includes(tabParam) ? tabParam : 'organization')
  const [loading, setLoading] = useState(true)
  const [organization, setOrganization] = useState<Organization | null>(null)
  
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

  // Update active tab when URL param changes
  useEffect(() => {
    if (tabParam && ['password', 'organization', 'structure', 'public-page'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])
  
  // Password form state
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  // Organization form state
  const [savingOrg, setSavingOrg] = useState(false)
  const [orgSuccess, setOrgSuccess] = useState(false)
  const [orgError, setOrgError] = useState('')
  const [orgFormData, setOrgFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    country: '',
  })
  
  // Structure state
  const [structure, setStructure] = useState<OrganizationUnit[]>([])
  const [editingUnit, setEditingUnit] = useState<OrganizationUnit | null>(null)
  const [unitForm, setUnitForm] = useState({ name: '', parent_id: '' })
  const [savingStructure, setSavingStructure] = useState(false)
  const [structureSuccess, setStructureSuccess] = useState(false)

  // Public page state (logo, hero, gallery, tagline, about)
  const [savingPublicPage, setSavingPublicPage] = useState(false)
  const [publicPageSuccess, setPublicPageSuccess] = useState(false)
  const [publicPageError, setPublicPageError] = useState('')
  const [publicPageFormData, setPublicPageFormData] = useState({
    logo_url: '',
    hero_image_url: '',
    tagline: '',
    about_html: '',
    gallery_image_urls: [] as string[],
  })

  useEffect(() => {
    async function fetchOrganization() {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()
      
      const profileData = profile as { organization_id: string | null } | null
      
      if (!profileData?.organization_id) {
        setLoading(false)
        return
      }
      
      const { data: org } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profileData.organization_id)
        .single()
      
      const orgData = org as Organization | null
      
      if (orgData) {
        setOrganization(orgData)
        setOrgFormData({
          name: orgData.name || '',
          slug: orgData.slug || '',
          email: orgData.email || '',
          phone: orgData.phone || '',
          website: orgData.website || '',
          address: orgData.address || '',
          city: orgData.city || '',
          country: orgData.country || '',
        })
        
        // Load structure from settings
        if (orgData.settings?.structure) {
          setStructure(orgData.settings.structure)
        }
        // Load public page from settings
        const pp = orgData.settings?.public_page
        setPublicPageFormData({
          logo_url: orgData.logo_url || '',
          hero_image_url: pp?.hero_image_url || '',
          tagline: pp?.tagline || '',
          about_html: pp?.about_html || '',
          gallery_image_urls: Array.isArray(pp?.gallery_image_urls) ? pp.gallery_image_urls : [],
        })
      }

      setLoading(false)
    }

    fetchOrganization()
  }, [])

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long')
      return
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password')
      return
    }
    
    setSavingPassword(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) {
        setPasswordError('User not found')
        setSavingPassword(false)
        return
      }
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword,
      })
      
      if (signInError) {
        setPasswordError('Current password is incorrect')
        setSavingPassword(false)
        return
      }
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })
      
      if (updateError) {
        setPasswordError(updateError.message || 'Failed to update password')
      } else {
        setPasswordSuccess(true)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => setPasswordSuccess(false), 3000)
      }
    } catch (err) {
      setPasswordError('An unexpected error occurred')
      console.error('Error updating password:', err)
    } finally {
      setSavingPassword(false)
    }
  }

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return
    
    setOrgError('')
    setOrgSuccess(false)
    setSavingOrg(true)
    
    try {
      const formData = new FormData()
      formData.append('name', orgFormData.name)
      formData.append('slug', orgFormData.slug)
      formData.append('email', orgFormData.email)
      formData.append('phone', orgFormData.phone)
      formData.append('website', orgFormData.website)
      formData.append('address', orgFormData.address)
      formData.append('city', orgFormData.city)
      formData.append('country', orgFormData.country)
      
      const result = await updateOrganization(formData)
      
      if (result.error) {
        setOrgError(result.error)
      } else {
        setOrgSuccess(true)
        setTimeout(() => setOrgSuccess(false), 3000)
        // Refresh organization data
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('user_id', user.id)
            .single()
          
          const profileData = profile as { organization_id: string | null } | null
          
          if (profileData?.organization_id) {
            const { data: org } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', profileData.organization_id)
              .single()
            
            const orgData = org as Organization | null
            
            if (orgData) {
              setOrganization(orgData)
            }
          }
        }
      }
    } catch (err) {
      setOrgError('An unexpected error occurred')
      console.error('Error updating organization:', err)
    } finally {
      setSavingOrg(false)
    }
  }

  const handleAddUnit = () => {
    if (!unitForm.name.trim()) return
    
    const newUnit: OrganizationUnit = {
      id: Date.now().toString(),
      name: unitForm.name,
      parent_id: unitForm.parent_id || null,
    }
    
    setStructure([...structure, newUnit])
    setUnitForm({ name: '', parent_id: '' })
    saveStructure([...structure, newUnit])
  }

  const handleEditUnit = (unit: OrganizationUnit) => {
    setEditingUnit(unit)
    setUnitForm({
      name: unit.name,
      parent_id: unit.parent_id || '',
    })
  }

  const handleUpdateUnit = () => {
    if (!editingUnit || !unitForm.name.trim()) return
    
    const updated = structure.map(u =>
      u.id === editingUnit.id
        ? { ...u, name: unitForm.name, parent_id: unitForm.parent_id || null }
        : u
    )
    
    setStructure(updated)
    setEditingUnit(null)
    setUnitForm({ name: '', parent_id: '' })
    saveStructure(updated)
  }

  const handleDeleteUnit = (id: string) => {
    const updated = structure.filter(u => u.id !== id && u.parent_id !== id)
    setStructure(updated)
    saveStructure(updated)
  }

  const saveStructure = async (newStructure: OrganizationUnit[]) => {
    if (!organization) return
    
    setSavingStructure(true)
    setStructureSuccess(false)
    
    try {
      // Use server action to save structure
      const result = await updateOrganizationStructure(newStructure)
      
      if (result.error) {
        console.error('Error saving structure:', result.error)
        setSavingStructure(false)
        return
      }
      
      // Update local state
      const currentSettings = organization.settings || {}
      const updatedSettings = {
        ...currentSettings,
        structure: newStructure,
      }
      
      if (organization) {
        setOrganization({ ...organization, settings: updatedSettings })
      }
      
      // Show success message
      setStructureSuccess(true)
      setTimeout(() => setStructureSuccess(false), 3000)
      
      // Refresh organization data from server to ensure sync
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('user_id', user.id)
          .single()
        
        const profileData = profile as { organization_id: string | null } | null
        
        if (profileData?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profileData.organization_id)
            .single()
          
          const orgData = org as Organization | null
          
          if (orgData) {
            setOrganization(orgData)
            // Update structure state from saved data
            if (orgData.settings?.structure) {
              setStructure(orgData.settings.structure)
            }
          }
        }
      }
    } catch (err) {
      console.error('Error saving structure:', err)
    } finally {
      setSavingStructure(false)
    }
  }

  const handlePublicPageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPublicPageError('')
    setPublicPageSuccess(false)
    setSavingPublicPage(true)
    try {
      const result = await updateOrganizationPublicPage({
        logo_url: publicPageFormData.logo_url || null,
        hero_image_url: publicPageFormData.hero_image_url || null,
        tagline: publicPageFormData.tagline || null,
        about_html: publicPageFormData.about_html || null,
        gallery_image_urls: publicPageFormData.gallery_image_urls,
      })
      if (result.error) {
        setPublicPageError(result.error)
      } else {
        setPublicPageSuccess(true)
        setTimeout(() => setPublicPageSuccess(false), 3000)
      }
    } catch (err) {
      setPublicPageError('An unexpected error occurred')
      console.error('Error saving public page:', err)
    } finally {
      setSavingPublicPage(false)
    }
  }

  const addGalleryUrl = () => {
    setPublicPageFormData((prev) => ({
      ...prev,
      gallery_image_urls: [...prev.gallery_image_urls, ''],
    }))
  }

  const updateGalleryUrl = (index: number, value: string) => {
    setPublicPageFormData((prev) => ({
      ...prev,
      gallery_image_urls: prev.gallery_image_urls.map((url, i) => (i === index ? value : url)),
    }))
  }

  const removeGalleryUrl = (index: number) => {
    setPublicPageFormData((prev) => ({
      ...prev,
      gallery_image_urls: prev.gallery_image_urls.filter((_, i) => i !== index),
    }))
  }

  // Build tree structure
  const buildTree = (units: OrganizationUnit[]): OrganizationUnit[] => {
    const unitMap = new Map<string, OrganizationUnit & { children?: OrganizationUnit[] }>()
    const roots: OrganizationUnit[] = []

    // Create map of all units
    units.forEach(unit => {
      unitMap.set(unit.id, { ...unit, children: [] })
    })

    // Build tree
    units.forEach(unit => {
      const unitWithChildren = unitMap.get(unit.id)!
      if (unit.parent_id && unitMap.has(unit.parent_id)) {
        const parent = unitMap.get(unit.parent_id)!
        if (!parent.children) parent.children = []
        parent.children.push(unitWithChildren)
      } else {
        roots.push(unitWithChildren)
      }
    })

    return roots
  }

  // Tree Node Component
  const TreeNode = ({ unit, level = 0, isLast = false, parentPath = [] }: { 
    unit: OrganizationUnit & { children?: OrganizationUnit[] }
    level?: number
    isLast?: boolean
    parentPath?: boolean[]
  }) => {
    const [isExpanded, setIsExpanded] = useState(true)
    const hasChildren = unit.children && unit.children.length > 0
    const children = unit.children || []

    return (
      <div>
        <div className="flex items-center gap-2 py-1.5 group">
          {/* Tree Lines - Indentation and connectors */}
          {level > 0 && (
            <div className="flex items-center" style={{ width: `${(level - 1) * 20 + 20}px` }}>
              {parentPath.map((shouldDrawLine, idx) => (
                <div key={idx} className="w-5 flex items-center justify-center">
                  {shouldDrawLine && (
                    <div className="w-px h-full bg-gray-300" />
                  )}
                </div>
              ))}
              <div className="w-5 flex items-center justify-center relative">
                {!isLast && (
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300" />
                )}
                <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-2.5 h-px bg-gray-300" />
                <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-px h-2.5 bg-gray-300" />
              </div>
            </div>
          )}

          {/* Expand/Collapse Button */}
          <div className="w-5 flex-shrink-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors rounded hover:bg-gray-100"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4" />
            )}
          </div>

          {/* Unit Content */}
          <div className="flex-1 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-orange-300 hover:bg-orange-50/30 hover:shadow-sm">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <Settings className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h5 className="font-medium text-gray-900 truncate">{unit.name}</h5>
                {hasChildren && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {children.length} child{children.length !== 1 ? 'ren' : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleEditUnit(unit)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-orange-100 hover:text-orange-600"
                title="Edit unit"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUnit(unit.id)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                title="Delete unit"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {children.map((child, idx) => (
              <TreeNode
                key={child.id}
                unit={child}
                level={level + 1}
                isLast={idx === children.length - 1}
                parentPath={[...parentPath, !isLast]}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Settings className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">No Organization</h2>
          <p className="mt-2 text-sm text-gray-500">You are not associated with any organization.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500">
          Manage your account and organization settings
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('organization')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'organization'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Building2 className="mr-2 inline h-4 w-4" />
            Organization
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'structure'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Settings className="mr-2 inline h-4 w-4" />
            Structure
          </button>
          <button
            onClick={() => setActiveTab('public-page')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'public-page'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <ImageIcon className="mr-2 inline h-4 w-4" />
            Public page
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === 'password'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Lock className="mr-2 inline h-4 w-4" />
            Password
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Organization Tab */}
        {activeTab === 'organization' && (
          <form onSubmit={handleOrgSubmit} className="space-y-6">
            {orgSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span>Organization updated successfully!</span>
              </div>
            )}
            
            {orgError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{orgError}</span>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Organization Information</h3>
                  <p className="text-sm text-gray-500">Update your organization details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={orgFormData.name}
                    onChange={(e) => {
                      setOrgFormData(prev => ({ ...prev, name: e.target.value }))
                      if (!orgFormData.slug || orgFormData.slug === generateSlug(organization.name)) {
                        setOrgFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }))
                      }
                    }}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                    URL Slug <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <span className="flex items-center border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                      {baseUrl}/org/
                    </span>
                    <input
                      id="slug"
                      type="text"
                      required
                      value={orgFormData.slug}
                      onChange={(e) => setOrgFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                      className="flex-1 border-0 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-0"
                      placeholder="my-school"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Only lowercase letters, numbers, and hyphens. This is your organization&apos;s unique URL.
                    {orgFormData.slug && (
                      <span className="ml-2">
                        <a 
                          href={`${baseUrl}/org/${orgFormData.slug}`} 
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={orgFormData.email}
                      onChange={(e) => setOrgFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={orgFormData.phone}
                      onChange={(e) => setOrgFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    id="website"
                    type="url"
                    value={orgFormData.website}
                    onChange={(e) => setOrgFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://www.yourschool.edu"
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={orgFormData.address}
                    onChange={(e) => setOrgFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={orgFormData.city}
                      onChange={(e) => setOrgFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      id="country"
                      type="text"
                      value={orgFormData.country}
                      onChange={(e) => setOrgFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={savingOrg}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingOrg ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
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
        )}

        {/* Public page Tab */}
        {activeTab === 'public-page' && (
          <form onSubmit={handlePublicPageSubmit} className="space-y-6">
            {publicPageSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span>Public page settings saved! View it at the link below.</span>
              </div>
            )}
            {publicPageError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{publicPageError}</span>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Public page</h3>
                  <p className="text-sm text-gray-500">
                    Customize logo, hero image, tagline, about text, and gallery for your organization&apos;s public page.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <input
                    id="logo_url"
                    type="url"
                    value={publicPageFormData.logo_url}
                    onChange={(e) => setPublicPageFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Shown in the hero section. Use a square or wide image URL.</p>
                </div>

                <div>
                  <label htmlFor="hero_image_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Hero / banner image URL
                  </label>
                  <input
                    id="hero_image_url"
                    type="url"
                    value={publicPageFormData.hero_image_url}
                    onChange={(e) => setPublicPageFormData((prev) => ({ ...prev, hero_image_url: e.target.value }))}
                    placeholder="https://example.com/hero.jpg"
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Background image for the top section. Leave empty for a gradient.</p>
                </div>

                <div>
                  <label htmlFor="tagline" className="block text-sm font-medium text-gray-700 mb-2">
                    Tagline
                  </label>
                  <input
                    id="tagline"
                    type="text"
                    value={publicPageFormData.tagline}
                    onChange={(e) => setPublicPageFormData((prev) => ({ ...prev, tagline: e.target.value }))}
                    placeholder="A short line under your organization name"
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="about_html" className="block text-sm font-medium text-gray-700 mb-2">
                    About (HTML)
                  </label>
                  <textarea
                    id="about_html"
                    rows={5}
                    value={publicPageFormData.about_html}
                    onChange={(e) => setPublicPageFormData((prev) => ({ ...prev, about_html: e.target.value }))}
                    placeholder="<p>Your organization description. You can use simple HTML like &lt;p&gt;, &lt;strong&gt;, &lt;a&gt;.</p>"
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Optional. Simple HTML is allowed. Leave empty for a default welcome message.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Gallery image URLs</label>
                    <button
                      type="button"
                      onClick={addGalleryUrl}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add image
                    </button>
                  </div>
                  <div className="space-y-2">
                    {publicPageFormData.gallery_image_urls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="url"
                          value={url}
                          onChange={(e) => updateGalleryUrl(index, e.target.value)}
                          placeholder={`Image ${index + 1} URL`}
                          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryUrl(index)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {publicPageFormData.gallery_image_urls.length === 0 && (
                      <p className="text-sm text-gray-500">No gallery images. Click &quot;Add image&quot; to add URLs.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-4">
                {organization?.slug && (
                  <a
                    href={`${baseUrl}/org/${organization.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-orange-600 hover:text-orange-700"
                  >
                    View public page →
                  </a>
                )}
                <button
                  type="submit"
                  disabled={savingPublicPage}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingPublicPage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save public page
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Structure Tab */}
        {activeTab === 'structure' && (
          <div className="space-y-6">
            {structureSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span>Organization structure saved successfully!</span>
              </div>
            )}
            
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Header */}
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Organization Structure</h3>
                      <p className="text-sm text-gray-500">Manage departments and organizational units</p>
                    </div>
                  </div>
                  {savingStructure && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Add/Edit Form */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-5">
                  <h4 className="mb-4 text-sm font-semibold text-gray-900">
                    {editingUnit ? (
                      <span className="flex items-center gap-2">
                        <Edit2 className="h-4 w-4" />
                        Edit Unit
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add New Unit
                      </span>
                    )}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Unit Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Mathematics Department, Science Division"
                        value={unitForm.name}
                        onChange={(e) => setUnitForm(prev => ({ ...prev, name: e.target.value }))}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Parent Unit <span className="text-gray-400">(Optional)</span>
                      </label>
                      <select
                        value={unitForm.parent_id}
                        onChange={(e) => setUnitForm(prev => ({ ...prev, parent_id: e.target.value }))}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">No parent (Top level unit)</option>
                        {structure
                          .filter(u => !editingUnit || u.id !== editingUnit.id)
                          .map(unit => (
                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                          ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Select a parent unit to create a hierarchical structure
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      {editingUnit ? (
                        <>
                          <button
                            type="button"
                            onClick={handleUpdateUnit}
                            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
                          >
                            <Save className="h-4 w-4" />
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUnit(null)
                              setUnitForm({ name: '', parent_id: '' })
                            }}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAddUnit}
                          disabled={!unitForm.name.trim()}
                          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-4 w-4" />
                          Add Unit
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Structure Tree */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Organization Tree ({structure.length} {structure.length === 1 ? 'unit' : 'units'})
                    </h4>
                  </div>
                  
                  {structure.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center">
                      <Settings className="mx-auto h-10 w-10 text-gray-300" />
                      <h3 className="mt-4 text-sm font-medium text-gray-900">No units yet</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Get started by adding your first organizational unit above
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="space-y-0.5">
                        {buildTree(structure).map((root, idx) => (
                          <TreeNode
                            key={root.id}
                            unit={root}
                            level={0}
                            isLast={idx === buildTree(structure).length - 1}
                            parentPath={[]}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            {passwordSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span>Password updated successfully!</span>
              </div>
            )}
            
            {passwordError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                  <p className="text-sm text-gray-500">Update your account password</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter new password (min. 6 characters)"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
