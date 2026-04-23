import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  BookOpen,
  GraduationCap,
} from 'lucide-react'
import Image from 'next/image'
import { PublicContainer, PublicMetricCards, PublicPageShell, PublicProcessFlow, PublicSpotlightStrip } from '@eduator/ui'
import { PublicHeader } from '../../components/public-header'

/** Public page customizations (school-admin editable) stored in organization.settings.public_page */
interface PublicPageSettings {
  hero_image_url?: string | null
  gallery_image_urls?: string[]
  tagline?: string | null
  about_html?: string | null
}

interface OrganizationRow {
  id: string
  name: string
  slug: string
  type?: string | null
  email: string
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  website?: string | null
  logo_url?: string | null
  settings?: { public_page?: PublicPageSettings; structure?: unknown } | null
}

async function getOrganizationBySlug(supabase: Awaited<ReturnType<typeof createServerClient>>, slug: string): Promise<OrganizationRow | null> {
  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !organization) {
    return null
  }

  return organization as OrganizationRow
}

/** Fetches public stats via RPC so anonymous users can view the page without needing RLS on profiles/classes */
async function getOrganizationPublicStats(supabase: Awaited<ReturnType<typeof createServerClient>>, slug: string): Promise<{
  teachers: number
  students: number
  classes: number
}> {
  const { data, error } = await supabase.rpc('get_organization_public_stats', { org_slug: slug })
  if (error || data == null) {
    return { teachers: 0, students: 0, classes: 0 }
  }
  const o = data as { teachers?: number; students?: number; classes?: number }
  return {
    teachers: Number(o.teachers) || 0,
    students: Number(o.students) || 0,
    classes: Number(o.classes) || 0,
  }
}

export default async function OrganizationPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const t = await getTranslations('orgPublic')
  const { slug } = await params
  const supabase = await createServerClient()
  const organization = await getOrganizationBySlug(supabase, slug)

  if (!organization) {
    notFound()
  }

  const stats = await getOrganizationPublicStats(supabase, slug)
  const publicPage = organization.settings?.public_page
  const heroImageUrl = publicPage?.hero_image_url || null
  const galleryUrls = Array.isArray(publicPage?.gallery_image_urls)
    ? publicPage.gallery_image_urls.filter((u): u is string => typeof u === 'string' && u.length > 0)
    : []
  const tagline = publicPage?.tagline || null
  const aboutHtml = publicPage?.about_html || null
  const logoUrl = organization.logo_url || null

  return (
    <PublicPageShell accent="green" className="bg-slate-50">
      <PublicHeader />

      {/* Hero */}
      <section
        className={`relative overflow-hidden ${
          heroImageUrl
            ? 'min-h-[320px] sm:min-h-[380px]'
            : 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 py-16 sm:py-24'
        }`}
      >
        {heroImageUrl && (
          <>
            <Image
              src={heroImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-slate-900/60" />
          </>
        )}
        <PublicContainer className="flex flex-col items-center py-12 text-center">
          {logoUrl && (
            <div className="mb-6 flex h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 bg-white shadow-lg sm:h-28 sm:w-28">
              <Image
                src={logoUrl}
                alt={`${organization.name} logo`}
                width={112}
                height={112}
                className="h-full w-full object-contain p-1"
                unoptimized
              />
            </div>
          )}
          <h1
            className={`text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl ${
              heroImageUrl ? 'text-white drop-shadow-md' : 'text-white'
            }`}
          >
            {organization.name}
          </h1>
          {organization.type && (
            <p
              className={`mt-2 text-sm font-medium uppercase tracking-wider ${
                heroImageUrl ? 'text-white/90' : 'text-emerald-100'
              }`}
            >
              {organization.type}
            </p>
          )}
          {tagline && (
            <p
              className={`mt-4 max-w-2xl text-lg sm:text-xl ${
                heroImageUrl ? 'text-white/95' : 'text-white/90'
              }`}
            >
              {tagline}
            </p>
          )}
        </PublicContainer>
      </section>

      <PublicContainer className="py-12">
      <main>
        <div className="space-y-12">
          <PublicMetricCards
            accent="green"
            items={[
              { label: t('metricsTeachersLabel'), value: `${stats.teachers}`, hint: t('metricsTeachersHint') },
              { label: t('metricsLearnersLabel'), value: `${stats.students}`, hint: t('metricsLearnersHint') },
              { label: t('metricsActiveClassesLabel'), value: `${stats.classes}`, hint: t('metricsActiveClassesHint') },
              { label: t('metricsModeLabel'), value: t('metricsModeValue'), hint: t('metricsModeHint') },
            ]}
          />

          {/* About */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t('aboutTitle', { name: organization.name })}</h2>
              </div>
              {aboutHtml ? (
                <div
                  className="prose prose-slate max-w-none text-slate-700 prose-p:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: aboutHtml }}
                />
              ) : (
                <p className="text-slate-600">
                  {t('aboutFallback', { name: organization.name })}
                </p>
              )}
            </div>
          </div>

          <PublicProcessFlow
            accent="green"
            steps={[
              { title: t('flowOrganizeTitle'), description: t('flowOrganizeDescription'), icon: <Users className="h-5 w-5" /> },
              { title: t('flowTeachTitle'), description: t('flowTeachDescription'), icon: <BookOpen className="h-5 w-5" /> },
              { title: t('flowMonitorTitle'), description: t('flowMonitorDescription'), icon: <GraduationCap className="h-5 w-5" /> },
              { title: t('flowOperateTitle'), description: t('flowOperateDescription'), icon: <Building2 className="h-5 w-5" /> },
            ]}
          />

          {/* Contact */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-6 sm:p-8">
              <h2 className="mb-6 text-xl font-bold text-slate-900">{t('contactSectionTitle')}</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {organization.email && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">{t('emailLabel')}</p>
                      <a
                        href={`mailto:${organization.email}`}
                        className="mt-1 block text-sm font-medium text-slate-900 hover:text-blue-600"
                      >
                        {organization.email}
                      </a>
                    </div>
                  </div>
                )}
                {organization.phone && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">{t('phoneLabel')}</p>
                      <a
                        href={`tel:${organization.phone}`}
                        className="mt-1 block text-sm font-medium text-slate-900 hover:text-emerald-600"
                      >
                        {organization.phone}
                      </a>
                    </div>
                  </div>
                )}
                {organization.website && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">{t('websiteLabel')}</p>
                      <a
                        href={
                          organization.website.startsWith('http')
                            ? organization.website
                            : `https://${organization.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-sm font-medium text-slate-900 hover:text-violet-600"
                      >
                        {organization.website}
                      </a>
                    </div>
                  </div>
                )}
                {(organization.address || organization.city || organization.country) && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">{t('locationLabel')}</p>
                      <p className="mt-1 text-sm text-slate-900">
                        {[organization.address, organization.city, organization.country]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gallery */}
          {galleryUrls.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="p-6 sm:p-8">
                <h2 className="mb-6 text-xl font-bold text-slate-900">{t('galleryTitle')}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {galleryUrls.map((url, i) => (
                    <div
                      key={`${url}-${i}`}
                      className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100"
                    >
                      <Image
                        src={url}
                        alt={`Gallery ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CTA - Sign in only; login page is org-specific when coming from this slug */}
          <PublicSpotlightStrip
            accent="green"
            kicker={t('spotlightKicker')}
            title={t('spotlightTitle', { name: organization.name })}
            description={t('spotlightDescription')}
            ctaLabel={t('spotlightCta')}
            ctaHref={`/auth/login?org=${encodeURIComponent(slug)}`}
          />

        </div>
      </main>
      </PublicContainer>

    </PublicPageShell>
  )
}
