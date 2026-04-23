import { Suspense } from 'react'
import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; error?: string }>
}) {
  const params = await searchParams
  const orgSlug = params.org?.trim() || null
  const errorParam = params.error?.trim() || ''
  const ERROR_MESSAGES: Record<string, string> = {
    service_unavailable:
      'Auth service is temporarily unavailable. Please try again in a few minutes.',
    auth_callback_error: 'Sign-in could not be completed. Please try again.',
  }
  const error = errorParam ? (ERROR_MESSAGES[errorParam] ?? errorParam) : ''

  let orgName: string | null = null
  let orgLogoUrl: string | null = null
  let orgHeroImageUrl: string | null = null
  let orgTagline: string | null = null

  if (orgSlug) {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('organizations')
      .select('name, logo_url, settings')
      .eq('slug', orgSlug)
      .eq('status', 'active')
      .single()
    if (data) {
      orgName = data.name ?? null
      orgLogoUrl = data.logo_url ?? null
      const publicPage = (data.settings as { public_page?: { hero_image_url?: string | null; tagline?: string | null } } | null)?.public_page
      orgHeroImageUrl = publicPage?.hero_image_url ?? null
      orgTagline = publicPage?.tagline ?? null
    }
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
        </div>
      }
    >
      <LoginForm
        orgSlug={orgSlug}
        orgName={orgName}
        orgLogoUrl={orgLogoUrl}
        orgHeroImageUrl={orgHeroImageUrl}
        orgTagline={orgTagline}
        error={error}
      />
    </Suspense>
  )
}
