'use server'

import { createAdminClient } from '@eduator/auth/supabase/admin'
import { createClient } from '@eduator/auth/supabase/server'
import { revalidatePath } from 'next/cache'

export interface OrganizationStructureItem {
  id: string
  name: string
  description?: string
  parent_id?: string | null
}

export async function updateOrganization(formData: FormData) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Get profile with organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) {
    return { error: 'No organization found' }
  }
  
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
  const website = formData.get('website') as string
  const address = formData.get('address') as string
  const city = formData.get('city') as string
  const country = formData.get('country') as string
  
  if (!name || !email) {
    return { error: 'Name and email are required' }
  }
  
  // Validate slug format
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (slug && !slugRegex.test(slug)) {
    return { error: 'Slug must be lowercase letters, numbers, and hyphens only' }
  }
  
  // Check if slug is unique (if changed)
  if (slug) {
    const { data: existingOrg } = await adminClient
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .neq('id', profile.organization_id)
      .single()
    
    if (existingOrg) {
      return { error: 'This URL slug is already taken. Please choose another.' }
    }
  }
  
  // Update organization using admin client
  const { error: updateError } = await adminClient
    .from('organizations')
    .update({
      name,
      slug: slug || undefined,
      email,
      phone: phone || null,
      website: website || null,
      address: address || null,
      city: city || null,
      country: country || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.organization_id)
  
  if (updateError) {
    console.error('Error updating organization:', updateError)
    return { error: 'Failed to update organization' }
  }
  
  revalidatePath('/school-admin/settings')
  return { success: true }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile) {
    return { error: 'Profile not found' }
  }
  
  const fullName = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  
  if (!fullName) {
    return { error: 'Full name is required' }
  }
  
  // Update profile using admin client
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({
      full_name: fullName,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)
  
  if (updateError) {
    console.error('Error updating profile:', updateError)
    return { error: 'Failed to update profile' }
  }
  
  revalidatePath('/school-admin/settings')
  return { success: true }
}

export async function updateOrganizationStructure(structure: OrganizationStructureItem[]) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Get profile with organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) {
    return { error: 'No organization found' }
  }
  
  // Get current organization settings
  const { data: org } = await adminClient
    .from('organizations')
    .select('settings')
    .eq('id', profile.organization_id)
    .single()
  
  if (!org) {
    return { error: 'Organization not found' }
  }
  
  // Update settings with new structure
  const currentSettings = org.settings || {}
  const updatedSettings = {
    ...currentSettings,
    structure: structure,
  }
  
  // Update organization using admin client
  const { error: updateError } = await adminClient
    .from('organizations')
    .update({
      settings: updatedSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.organization_id)
  
  if (updateError) {
    console.error('Error updating organization structure:', updateError)
    return { error: 'Failed to save organization structure' }
  }

  revalidatePath('/school-admin/settings')
  return { success: true }
}

export interface PublicPageSettingsInput {
  logo_url?: string | null
  hero_image_url?: string | null
  gallery_image_urls?: string[]
  tagline?: string | null
  about_html?: string | null
}

export async function updateOrganizationPublicPage(input: PublicPageSettingsInput) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!profile?.organization_id) {
    return { error: 'No organization found' }
  }

  const { data: org } = await adminClient
    .from('organizations')
    .select('settings, logo_url, slug')
    .eq('id', profile.organization_id)
    .single()

  if (!org) {
    return { error: 'Organization not found' }
  }

  const currentSettings = (org.settings as Record<string, unknown>) || {}
  const currentPublicPage = (currentSettings.public_page as Record<string, unknown>) || {}
  const orgSlug = (org as { slug?: string }).slug

  const publicPage = {
    ...currentPublicPage,
    ...(input.hero_image_url !== undefined && { hero_image_url: input.hero_image_url || null }),
    ...(input.gallery_image_urls !== undefined && { gallery_image_urls: input.gallery_image_urls }),
    ...(input.tagline !== undefined && { tagline: input.tagline || null }),
    ...(input.about_html !== undefined && { about_html: input.about_html || null }),
  }

  const updatedSettings = {
    ...currentSettings,
    public_page: publicPage,
  }

  const updatePayload: { settings: typeof updatedSettings; updated_at: string; logo_url?: string | null } = {
    settings: updatedSettings,
    updated_at: new Date().toISOString(),
  }
  if (input.logo_url !== undefined) {
    updatePayload.logo_url = input.logo_url || null
  }

  const { error: updateError } = await adminClient
    .from('organizations')
    .update(updatePayload)
    .eq('id', profile.organization_id)

  if (updateError) {
    console.error('Error updating organization public page:', updateError)
    return { error: 'Failed to save public page settings' }
  }

  revalidatePath('/school-admin/settings')
  if (orgSlug) {
    revalidatePath(`/org/${orgSlug}`)
  }
  return { success: true }
}