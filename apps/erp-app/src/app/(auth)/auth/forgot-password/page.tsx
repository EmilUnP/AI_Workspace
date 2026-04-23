import Link from 'next/link'
import { GraduationCap, ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { PublicContainer, PublicPageShell } from '@eduator/ui'
import { LocaleSwitcher } from '../../../components/locale-switcher'
import { getMarketingUrl } from '@/lib/marketing-url'

export default async function ForgotPasswordPage() {
  const t = await getTranslations('forgotPassword')
  const marketingBaseUrl = getMarketingUrl()

  return (
    <PublicPageShell accent="green" className="bg-[#f8fdf9]">
      <div className="absolute right-4 top-4 z-10">
        <LocaleSwitcher accent="green" />
      </div>
      <PublicContainer className="flex min-h-screen flex-col justify-center py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white/80 p-8 shadow-xl backdrop-blur-sm">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 shadow-lg shadow-emerald-500/25">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Eduator AI ERP</span>
          </Link>
          <h1 className="mt-10 text-2xl font-bold tracking-tight text-gray-900">
            {t('title')} <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{t('titleHighlight')}</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {t('description')}
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backToSignIn')}
            </Link>
            <a
              href={marketingBaseUrl}
              className="text-center text-xs font-medium text-emerald-500 hover:text-emerald-600"
            >
              Back to main site
            </a>
          </div>
        </div>
      </div>
      </PublicContainer>
    </PublicPageShell>
  )
}
