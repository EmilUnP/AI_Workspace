/**
 * Pathname → message module mapping for i18n.
 * Used to load only the relevant message subset per route for smaller bundles
 * and path-based dynamic imports.
 *
 * ERP has two separate admin profiles: platform owner and school admin,
 * each with its own message module.
 */

export const MESSAGE_MODULES = [
  'public',
  'teacher',
  'platform-owner',
  'school-admin',
] as const
export type MessageModule = (typeof MESSAGE_MODULES)[number]

/** Path prefixes that use the teacher message module */
const TEACHER_PREFIXES = ['/teacher']

/** Path prefixes that use the platform-owner message module */
const PLATFORM_OWNER_PREFIXES = ['/platform-owner']

/** Path prefixes that use the school-admin message module */
const SCHOOL_ADMIN_PREFIXES = ['/school-admin']

/**
 * Resolves the message module for a given pathname.
 * Order: teacher → platform-owner → school-admin → public (default).
 */
export function getMessageModule(pathname: string): MessageModule {
  const normalized = pathname.replace(/\/$/, '') || '/'
  if (TEACHER_PREFIXES.some((p) => normalized === p || normalized.startsWith(p + '/')))
    return 'teacher'
  if (PLATFORM_OWNER_PREFIXES.some((p) => normalized === p || normalized.startsWith(p + '/')))
    return 'platform-owner'
  if (SCHOOL_ADMIN_PREFIXES.some((p) => normalized === p || normalized.startsWith(p + '/')))
    return 'school-admin'
  return 'public'
}
