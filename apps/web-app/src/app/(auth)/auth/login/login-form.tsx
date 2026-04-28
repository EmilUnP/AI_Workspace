'use client'

import Link from 'next/link'
import Image from 'next/image'
import { GraduationCap, Mail, Lock, ArrowRight, AlertCircle, Building2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LocaleSwitcher } from '../../../components/locale-switcher'

export interface LoginFormProps {
  orgSlug: string | null
  orgName: string | null
  orgLogoUrl: string | null
  orgHeroImageUrl: string | null
  orgTagline: string | null
  error: string
}

/**
 * When from /org/[slug]: same style and assets (logo, hero) as org page.
 * Main Web app login: original clean emerald design.
 */
export function LoginForm({
  orgSlug,
  orgName,
  orgLogoUrl,
  orgHeroImageUrl,
  orgTagline,
  error,
}: LoginFormProps) {
  const t = useTranslations('login')
  const isOrgContext = Boolean(orgSlug && orgName)

  // ----- Main Web app login (clean, original design) -----
  if (!isOrgContext) {
    return (
      <div className="relative flex min-h-screen overflow-hidden bg-[#f8fdf9]">
        <div className="absolute right-4 top-4 z-10">
          <LocaleSwitcher accent="green" />
        </div>
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_0%_20%,rgba(16,185,129,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_80%,rgba(5,150,105,0.06),transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(to right, #0d9488 1px, transparent 1px), linear-gradient(to bottom, #0d9488 1px, transparent 1px)', backgroundSize: '3rem 3rem' }} />
        </div>

        {/* Left side - branding/story (matches Web app layout styling) */}
        <div className="relative hidden w-0 flex-1 lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700">
            <div className="flex h-full flex-col items-center justify-center p-12 text-white">
              <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <GraduationCap className="h-14 w-14" />
              </div>
              <h2 className="mb-4 text-4xl font-bold">{t('sidePanelTitle')}</h2>
              <p className="max-w-md text-center text-lg text-green-100">
                {t('sidePanelDescription')}
              </p>
              <div className="mt-12 grid grid-cols-2 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold">100+</div>
                  <div className="text-green-200">{t('sidePanelOrganizations')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">50K+</div>
                  <div className="text-green-200">{t('sidePanelUsers')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">1M+</div>
                  <div className="text-green-200">{t('sidePanelExamsCreated')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">99.9%</div>
                  <div className="text-green-200">{t('sidePanelUptime')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side – form */}
        <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 shadow-lg shadow-emerald-500/25">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Eduator AI Web</span>
            </Link>
            <h2 className="mt-10 text-3xl font-bold tracking-tight text-gray-900">
              {t('title')} <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{t('titleHighlight')}</span>
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {t('subtitle')}
            </p>

            <div className="mt-10">
              <form action="/api/auth/login" method="POST" className="space-y-6">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    {t('emailLabel')}
                  </label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="block w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-900 shadow-sm placeholder:text-gray-400 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder={t('emailPlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    {t('passwordLabel')}
                  </label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="block w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-gray-900 shadow-sm placeholder:text-gray-400 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder={t('passwordPlaceholder')}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    {t('rememberMe')}
                  </label>
                  <Link href="/auth/forgot-password" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
                    {t('forgotPassword')}
                  </Link>
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                >
                  {t('signIn')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

            </div>
          </div>
        </div>
      </div>
    )
  }

  // ----- Organization login (matches org page style: logo, hero, same look) -----
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 relative">
      <div className="absolute right-4 top-4 z-10">
        <LocaleSwitcher accent="green" />
      </div>
      <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[400px]">
          <Link
            href={orgSlug ? `/org/${orgSlug}` : '/'}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            {orgLogoUrl ? (
              <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <Image src={orgLogoUrl} alt="" width={40} height={40} className="h-full w-full object-contain p-0.5" unoptimized />
              </span>
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-white">
                <Building2 className="h-5 w-5" />
              </span>
            )}
            <span className="font-semibold">{orgName}</span>
          </Link>

          <div className="mt-10">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {t('orgLoginTitle')} {orgName}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {t('orgLoginSubtitle')}
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6 sm:p-8">
              <form action="/api/auth/login" method="POST" className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                {orgSlug && (
                  <>
                    <input type="hidden" name="redirectTo" value={`/org/${orgSlug}`} />
                    <input type="hidden" name="org" value={orgSlug} />
                  </>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">{t('orgLoginEmailLabel')}</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder={t('orgLoginEmailPlaceholder')}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">{t('orgLoginPasswordLabel')}</label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder={t('orgLoginPasswordPlaceholder')}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    {t('orgLoginRememberMe')}
                  </label>
                  <Link href="/auth/forgot-password" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                    {t('orgLoginForgotPassword')}
                  </Link>
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  {t('orgLoginSignIn')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`relative hidden lg:flex lg:w-[480px] xl:w-[520px] flex-shrink-0 flex-col justify-center overflow-hidden ${
          orgHeroImageUrl ? 'min-h-[400px]' : 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700'
        }`}
      >
        {orgHeroImageUrl && (
          <>
            <Image src={orgHeroImageUrl} alt="" fill className="object-cover" sizes="520px" unoptimized />
            <div className="absolute inset-0 bg-slate-900/60" />
          </>
        )}
        <div className="relative z-10 flex flex-col items-center justify-center px-8 py-16 text-center text-white">
          {orgLogoUrl ? (
            <div className="mb-6 flex h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 bg-white shadow-lg sm:h-28 sm:w-28">
              <Image src={orgLogoUrl} alt={`${orgName} logo`} width={112} height={112} className="h-full w-full object-contain p-1" unoptimized />
            </div>
          ) : (
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10">
              <Building2 className="h-10 w-10" />
            </div>
          )}
          <h2 className="text-2xl font-bold sm:text-3xl">{orgName}</h2>
          {orgTagline ? <p className="mt-2 max-w-sm text-white/90">{orgTagline}</p> : <p className="mt-3 max-w-sm text-white/80">{t('orgLoginDefaultTagline')}</p>}
        </div>
      </div>
    </div>
  )
}
