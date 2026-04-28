import { createAuthMiddleware } from '@eduator/auth/supabase/middleware'
import { updateSession } from '@eduator/auth/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { isPathEnabled } from '@eduator/core/utils'
import { X_PATHNAME_HEADER } from './i18n/constants'

export { X_PATHNAME_HEADER }

const baseMiddleware = createAuthMiddleware({
  public: [
    '/',
    '/org',
    '/auth/login',
    '/api/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/callback',
    '/auth/session',
    '/auth/pending-approval',
    '/auth/access-denied',
    '/auth/verify',
  ],
  protected: [
    '/platform-owner',
    '/school-admin',
  ],
  roleRoutes: {
    platform_owner: ['/platform-owner'],
    school_superadmin: ['/school-admin'],
    teacher: ['/school-admin'],
  },
})

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const response = await baseMiddleware(request)
  if (response.status >= 300 && response.status < 400) return response

  if (pathname.startsWith('/school-admin')) {
    const { user, supabase } = await updateSession(request)

    if (user && supabase) {
      const role = 'teacher'
      const { data: visibilityRows } = await supabase
        .from('feature_visibility_rules')
        .select('feature_key, enabled')
        .eq('app_source', 'erp')
        .eq('role', role)

      const enabledMap = Object.fromEntries(
        ((visibilityRows as { feature_key: string; enabled: boolean }[]) ?? []).map((row) => [
          row.feature_key,
          row.enabled,
        ])
      )

      if (!isPathEnabled('erp', role, pathname, enabledMap)) {
        return NextResponse.redirect(new URL('/school-admin', request.url))
      }
    }
  }

  response.headers.set(X_PATHNAME_HEADER, pathname)
  return response
}

export const config = {
  // Exclude /api so API routes (e.g. POST /api/auth/login) are not touched by web middleware.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
}
