export const LOCALE_COOKIE_NAME = 'eduator_locale'
export const SUPPORTED_LOCALES = ['en', 'az'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

const isSupportedLocale = (value: string): value is AppLocale => {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export const normalizeLocale = (value: string | null | undefined): AppLocale => {
  if (!value) return 'en'
  const short = value.toLowerCase().split('-')[0]
  return isSupportedLocale(short) ? short : 'en'
}

export const getClientLocale = (): AppLocale => {
  if (typeof document === 'undefined') return 'en'
  const pair = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`))
  if (!pair) return 'en'
  const raw = pair.slice(`${LOCALE_COOKIE_NAME}=`.length)
  return normalizeLocale(decodeURIComponent(raw))
}

export const setClientLocale = (locale: AppLocale) => {
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`
}

type NamespaceMap = Record<string, string>
type LocaleTranslations = Record<string, NamespaceMap>
type I18nTable = Record<AppLocale, LocaleTranslations>

const translations: I18nTable = {
  en: {
    common: {
      signIn: 'Sign in',
      signOut: 'Sign out',
      language: 'Language',
      english: 'English',
      azerbaijani: 'Azerbaijani'
    },
    login: {
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      signIn: 'Sign in'
    },
    platformOwner: {
      navDashboard: 'Dashboard',
      navUsers: 'Users',
      rolePlatformOwner: 'Platform Owner',
      roleAdmin: 'Admin',
      roleOperator: 'Operator',
      roleUser: 'User',
      dashboardTitle: 'Platform Dashboard',
      dashboardSubtitle: 'Overview of your educational platform',
      manageUsers: 'Manage Users',
      totalUsers: 'Total Users',
      adminsOperators: 'Admins / Operators',
      recentUsers: 'Recent Users',
      recentUsersSubtitle: 'Latest registrations across the platform',
      noUsersYet: 'No users yet',
      usersTitle: 'Users',
      usersSubtitle: '{count} users in backend database',
      addOperator: 'Add operator',
      email: 'Email',
      password: 'Password',
      manualNote: 'Manual note',
      noUsersFound: 'No users found',
      addFirstOperatorHint: 'Add your first operator using the form above.',
      role: 'Role',
      actions: 'Actions',
      view: 'View',
      allRoles: 'All Roles',
      allSources: 'All Sources',
      erpUsers: 'ERP Users',
      apiUsers: 'API Users',
      roleSchoolAdmin: 'School Admin',
      roleTeacher: 'Teacher',
      searchUsers: 'Search users...',
      allStatus: 'All Status',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      backToUsers: 'Back to Users',
      updatePassword: 'Update Password',
      newPassword: 'New password',
      updatePasswordButton: 'Update password',
      userInformation: 'User Information',
      userId: 'User ID',
      authId: 'Auth ID',
      joined: 'Joined',
      lastUpdated: 'Last Updated'
    }
  },
  az: {
    common: {
      signIn: 'Daxil ol',
      signOut: 'Çıxış',
      language: 'Dil',
      english: 'İngilis',
      azerbaijani: 'Azərbaycan'
    },
    login: {
      emailLabel: 'E-poçt',
      emailPlaceholder: 'siz@example.com',
      passwordLabel: 'Şifrə',
      passwordPlaceholder: 'Şifrənizi daxil edin',
      signIn: 'Daxil ol'
    },
    platformOwner: {
      navDashboard: 'İdarə paneli',
      navUsers: 'İstifadəçilər',
      rolePlatformOwner: 'Platform sahibi',
      roleAdmin: 'Admin',
      roleOperator: 'Operator',
      roleUser: 'İstifadəçi',
      dashboardTitle: 'Platform İdarə Paneli',
      dashboardSubtitle: 'Təhsil platformanızın ümumi görünüşü',
      manageUsers: 'İstifadəçiləri idarə et',
      totalUsers: 'Ümumi istifadəçi',
      adminsOperators: 'Adminlər / Operatorlar',
      recentUsers: 'Son istifadəçilər',
      recentUsersSubtitle: 'Platformadakı ən yeni qeydiyyatlar',
      noUsersYet: 'Hələ istifadəçi yoxdur',
      usersTitle: 'İstifadəçilər',
      usersSubtitle: 'Backend verilənlər bazasında {count} istifadəçi',
      addOperator: 'Operator əlavə et',
      email: 'E-poçt',
      password: 'Şifrə',
      manualNote: 'Əl qeydi',
      noUsersFound: 'İstifadəçi tapılmadı',
      addFirstOperatorHint: 'Yuxarıdakı forma ilə ilk operatoru əlavə edin.',
      role: 'Rol',
      actions: 'Əməliyyatlar',
      view: 'Bax',
      allRoles: 'Bütün rollar',
      allSources: 'Bütün mənbələr',
      erpUsers: 'ERP istifadəçiləri',
      apiUsers: 'API istifadəçiləri',
      roleSchoolAdmin: 'Məktəb admini',
      roleTeacher: 'Müəllim',
      searchUsers: 'İstifadəçi axtar...',
      allStatus: 'Bütün statuslar',
      pending: 'Gözləmədə',
      approved: 'Təsdiqlənib',
      rejected: 'Rədd edilib',
      backToUsers: 'İstifadəçilərə qayıt',
      updatePassword: 'Şifrəni yenilə',
      newPassword: 'Yeni şifrə',
      updatePasswordButton: 'Şifrəni yenilə',
      userInformation: 'İstifadəçi məlumatları',
      userId: 'İstifadəçi ID',
      authId: 'Auth ID',
      joined: 'Qoşulub',
      lastUpdated: 'Son yenilənmə'
    }
  }
}

export const resolveTranslation = (
  locale: AppLocale,
  namespace: string | undefined,
  key: string
): string => {
  if (!namespace) return key
  const localizedNamespace = translations[locale]?.[namespace] ?? {}
  const englishNamespace = translations.en?.[namespace] ?? {}
  return localizedNamespace[key] ?? englishNamespace[key] ?? key
}

