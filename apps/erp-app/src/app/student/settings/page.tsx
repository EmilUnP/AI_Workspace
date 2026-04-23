import { createClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { Mail, User } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

async function getStudentProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, organization_id')
    .eq('user_id', user.id)
    .single()
  return profile ? { ...profile, profileId: profile.id } : null
}

export default async function StudentSettingsPage() {
  const data = await getStudentProfile()
  if (!data) redirect('/auth/login')

  if (!data.organization_id) redirect('/auth/access-denied')

  const t = await getTranslations('studentSettings')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            {data.avatar_url ? (
              <img src={data.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <span className="text-xl font-medium">
                {data.full_name?.charAt(0).toUpperCase() || 'S'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t('profile')}
            </p>
            <p className="truncate text-base font-semibold text-gray-900">
              {data.full_name || 'Student'}
            </p>
            {data.email && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{data.email}</span>
              </p>
            )}
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-400">
              <User className="h-3 w-3" />
              {t('enterpriseStudentAccount')}
            </p>
          </div>
        </div>

        <div className="h-px w-full bg-gray-100" />

        <div className="space-y-2 text-xs text-gray-500">
          <p>{t('accountInfoDescription')}</p>
          <p>{t('contactAdminDescription')}</p>
        </div>
      </div>
    </div>
  )
}
