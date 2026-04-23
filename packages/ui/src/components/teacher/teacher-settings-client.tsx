'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  Mail, 
  Building2, 
  Shield,
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'

export interface TeacherSettingsTranslations {
  title: string
  subtitle: string
  profileInfo: string
  fullName: string
  emailAddress: string
  role: string
  roleTeacher: string
  status: string
  statusApproved: string
  statusPending: string
  statusRejected: string
  organization: string
  organizationName: string
  subscriptionPlan: string
  changePassword: string
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
  passwordMinLength: string
  updatePassword: string
  updatingPassword: string
  passwordUpdatedSuccess: string
  passwordsDoNotMatch: string
  passwordTooShort: string
  supabaseNotConfigured: string
  userNotFound: string
  currentPasswordIncorrect: string
  failedToUpdatePassword: string
  unexpectedError: string
  enterpriseAccount: string
  enterprisePasswordNotice: string
  contactAdminName: string
  contactAdminEmail: string
  save: string
  saving: string
  nameRequired: string
  nameUpdatedSuccess: string
  yourName: string
}

const DEFAULT_TRANSLATIONS: TeacherSettingsTranslations = {
  title: 'Settings',
  subtitle: 'Manage your account settings',
  profileInfo: 'Profile Information',
  fullName: 'Full Name',
  emailAddress: 'Email Address',
  role: 'Role',
  roleTeacher: 'Teacher',
  status: 'Status',
  statusApproved: 'Approved',
  statusPending: 'Pending',
  statusRejected: 'Rejected',
  organization: 'Organization',
  organizationName: 'Organization Name',
  subscriptionPlan: 'Subscription Plan',
  changePassword: 'Change Password',
  currentPassword: 'Current Password',
  newPassword: 'New Password',
  confirmNewPassword: 'Confirm New Password',
  passwordMinLength: 'Must be at least 6 characters',
  updatePassword: 'Update Password',
  updatingPassword: 'Updating...',
  passwordUpdatedSuccess: 'Password updated successfully!',
  passwordsDoNotMatch: 'New passwords do not match',
  passwordTooShort: 'Password must be at least 6 characters',
  supabaseNotConfigured: 'Supabase client not configured',
  userNotFound: 'User not found',
  currentPasswordIncorrect: 'Current password is incorrect',
  failedToUpdatePassword: 'Failed to update password',
  unexpectedError: 'An unexpected error occurred',
  enterpriseAccount: 'Enterprise Account',
  enterprisePasswordNotice: 'Your password is managed by your organization\'s School Administrator. For password changes, please contact your administrator.',
  contactAdminName: 'Contact your School Administrator to update your name',
  contactAdminEmail: 'Contact your School Administrator to update your email',
  save: 'Save',
  saving: 'Saving...',
  nameRequired: 'Name is required.',
  nameUpdatedSuccess: 'Name updated successfully',
  yourName: 'Your name',
}

export interface TeacherSettingsClientProps {
  profile: {
    full_name?: string | null
    email?: string | null
    profile_type?: string | null
    approval_status?: string | null
  }
  user: {
    email?: string | null
  }
  organization?: {
    name?: string | null
    subscription_plan?: string | null
  } | null
  variant?: 'erp'
  createSupabaseClient?: () => any
  onUpdateName?: (fullName: string) => Promise<{ error?: string }>
  translations?: Partial<TeacherSettingsTranslations>
}

export function TeacherSettingsClient({ 
  profile, 
  user: initialUser, 
  organization,
  variant = 'erp',
  createSupabaseClient,
  onUpdateName,
  translations: translationsProp,
}: TeacherSettingsClientProps) {
  const isERP = variant === 'erp'
  const t = { ...DEFAULT_TRANSLATIONS, ...translationsProp }
  
  // Name edit state (ERP when onUpdateName provided)
  const [nameValue, setNameValue] = useState(profile?.full_name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)
  const [nameError, setNameError] = useState('')
  useEffect(() => {
    setNameValue(profile?.full_name ?? '')
  }, [profile?.full_name])

  // Password state (only for ERP)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError(t.passwordsDoNotMatch)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError(t.passwordTooShort)
      return
    }

    setSavingPassword(true)

    try {
      if (!createSupabaseClient) {
        setPasswordError(t.supabaseNotConfigured)
        setSavingPassword(false)
        return
      }
      const supabase = createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) {
        setPasswordError(t.userNotFound)
        setSavingPassword(false)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword,
      })

      if (signInError) {
        setPasswordError(t.currentPasswordIncorrect)
        setSavingPassword(false)
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (updateError) {
        setPasswordError(updateError.message || t.failedToUpdatePassword)
      } else {
        setPasswordSuccess(true)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => setPasswordSuccess(false), 3000)
      }
    } catch (err) {
      setPasswordError(t.unexpectedError)
      console.error('Error updating password:', err)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="mt-1 text-gray-500">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Profile Information */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <User className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{t.profileInfo}</h2>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.fullName}
            </label>
            {!isERP && onUpdateName ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={nameValue}
                      onChange={(e) => {
                        setNameValue(e.target.value)
                        setNameError('')
                      }}
                      placeholder={t.yourName}
                      className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      disabled={savingName}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const trimmed = nameValue.trim()
                      if (!trimmed) {
                        setNameError(t.nameRequired)
                        return
                      }
                      setSavingName(true)
                      setNameError('')
                      setNameSuccess(false)
                      const result = await onUpdateName(trimmed)
                      setSavingName(false)
                      if (result.error) {
                        setNameError(result.error)
                      } else {
                        setNameSuccess(true)
                        setTimeout(() => setNameSuccess(false), 3000)
                      }
                    }}
                    disabled={savingName}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {savingName ? t.saving : t.save}
                  </button>
                </div>
                {nameError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {nameError}
                  </p>
                )}
                {nameSuccess && (
                  <p className="text-sm text-green-700 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    {t.nameUpdatedSuccess}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{profile?.full_name || '—'}</span>
                </div>
                {isERP && (
                  <p className="mt-1 text-xs text-gray-500">
                    {t.contactAdminName}
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.emailAddress}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900">{profile?.email || initialUser?.email || '—'}</span>
            </div>
            {isERP && (
              <p className="mt-1 text-xs text-gray-500">
                {t.contactAdminEmail}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.role}
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5">
              <Shield className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-900 capitalize">{profile?.profile_type === 'teacher' ? t.roleTeacher : (profile?.profile_type?.replace('_', ' ') || t.roleTeacher)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.status}
            </label>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                profile?.approval_status === 'approved'
                  ? 'bg-green-100 text-green-700'
                  : profile?.approval_status === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {profile?.approval_status === 'approved'
                  ? t.statusApproved
                  : profile?.approval_status === 'pending'
                  ? t.statusPending
                  : t.statusRejected}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Information - ERP Only */}
      {organization && isERP && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{t.organization}</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.organizationName}
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5">
                <span className="text-sm text-gray-900">{organization.name || '—'}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.subscriptionPlan}
              </label>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 capitalize">
                  {organization.subscription_plan || 'basic'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{t.changePassword}</h2>
        </div>

        {isERP ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">{t.enterpriseAccount}</h3>
                <p className="mt-1 text-sm text-amber-800">
                  {t.enterprisePasswordNotice}
                </p>
              </div>
            </div>
          </div>
        ) : (
          // ERP: Show password change form
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.currentPassword}
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.newPassword}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">{t.passwordMinLength}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.confirmNewPassword}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-800">{t.passwordUpdatedSuccess}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingPassword ? t.updatingPassword : t.updatePassword}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
