import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { PublicHeaderClient } from '@eduator/ui'
import { getAppUrl } from '@/lib/portal-urls'
import { LocaleSwitcher } from './locale-switcher'

export async function PublicHeader() {
  const tc = await getTranslations('common')
  const appUrl = getAppUrl()

  return (
    <PublicHeaderClient
      navLinks={[]}
      authContent={
        <>
          <Link
            href={`${appUrl}/auth/login`}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            {tc('signIn')}
          </Link>
        </>
      }
      brandName="Eduator AI"
      accent="violet"
      headerClass="border-violet-100"
      languageSwitcher={<LocaleSwitcher accent="violet" />}
    />
  )
}

