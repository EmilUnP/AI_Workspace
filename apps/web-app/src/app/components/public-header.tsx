import Link from 'next/link'
import { PublicHeaderClient } from '@eduator/ui'
import { getUserProfile } from '@eduator/auth/supabase/server'
import { getTranslations } from 'next-intl/server'
import { UserNav } from '../platform-owner/user-nav'
import { LocaleSwitcher } from './locale-switcher'

function getDashboardAndSettings(
  profileType: string | null | undefined
): { dashboardHref: string | null } {
  switch (profileType) {
    case 'platform_owner':
      return { dashboardHref: '/platform-owner' }
    case 'school_superadmin':
      return { dashboardHref: '/school-admin' }
    case 'teacher':
      return { dashboardHref: '/school-admin' }
    default:
      return { dashboardHref: null }
  }
}

export async function PublicHeader() {
  const profile = await getUserProfile()
  const { dashboardHref } = getDashboardAndSettings(profile?.profile_type)
  const tc = await getTranslations('common')

  const authContent = profile ? (
    <>
      {dashboardHref && (
        <Link
          href={dashboardHref}
          className="text-sm font-medium text-green-600 transition-colors hover:text-green-700"
        >
          {tc('dashboard')}
        </Link>
      )}
      <UserNav
        profile={{
          full_name: profile.full_name ?? profile.email?.split('@')[0] ?? 'User',
          email: profile.email ?? '',
          avatar_url: profile.avatar_url ?? null,
        }}
      />
    </>
  ) : (
    <Link
      href="/auth/login"
      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-green-700 hover:shadow-lg"
    >
      {tc('signIn')}
    </Link>
  )

  return (
    <PublicHeaderClient
      navLinks={[]}
      authContent={authContent}
      brandName="Eduator AI Web"
      accent="green"
      headerClass="border-green-100"
      languageSwitcher={<LocaleSwitcher accent="green" />}
    />
  )
}
