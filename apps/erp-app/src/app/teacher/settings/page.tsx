import { createClient as createServerClient } from '@eduator/auth/supabase/server'
import { redirect } from 'next/navigation'
import { TeacherSettingsClient } from '@eduator/ui'
import { getTranslations } from 'next-intl/server'

async function getTeacherInfo() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations(*)
    `)
    .eq('user_id', user.id)
    .single()
  
  if (!profile) return null
  
  const org = Array.isArray(profile.organizations) 
    ? profile.organizations[0] 
    : profile.organizations
  
  return { profile, organization: org, user }
}

export default async function TeacherSettingsPage() {
  const data = await getTeacherInfo()
  
  if (!data?.profile) {
    redirect('/auth/login')
  }

  const t = await getTranslations('teacherSettings')

  const translations = {
    title: t('title'),
    subtitle: t('subtitle'),
    profileInfo: t('profileInfo'),
    fullName: t('fullName'),
    emailAddress: t('emailAddress'),
    role: t('role'),
    roleTeacher: t('roleTeacher'),
    status: t('status'),
    statusApproved: t('statusApproved'),
    statusPending: t('statusPending'),
    statusRejected: t('statusRejected'),
    organization: t('organization'),
    organizationName: t('organizationName'),
    subscriptionPlan: t('subscriptionPlan'),
    changePassword: t('changePassword'),
    currentPassword: t('currentPassword'),
    newPassword: t('newPassword'),
    confirmNewPassword: t('confirmNewPassword'),
    passwordMinLength: t('passwordMinLength'),
    updatePassword: t('updatePassword'),
    updatingPassword: t('updatingPassword'),
    passwordUpdatedSuccess: t('passwordUpdatedSuccess'),
    passwordsDoNotMatch: t('passwordsDoNotMatch'),
    passwordTooShort: t('passwordTooShort'),
    currentPasswordIncorrect: t('currentPasswordIncorrect'),
    failedToUpdatePassword: t('failedToUpdatePassword'),
    unexpectedError: t('unexpectedError'),
    enterpriseAccount: t('enterpriseAccount'),
    enterprisePasswordNotice: t('enterprisePasswordNotice'),
    contactAdminName: t('contactAdminName'),
    contactAdminEmail: t('contactAdminEmail'),
    save: t('save'),
    saving: t('saving'),
    nameRequired: t('nameRequired'),
    nameUpdatedSuccess: t('nameUpdatedSuccess'),
    yourName: t('yourName'),
  }
  
  return <TeacherSettingsClient {...data} variant="erp" translations={translations} />
}
