import { createAuthMiddleware } from '@eduator/auth/supabase/middleware'
import { type NextRequest } from 'next/server'
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

  response.headers.set(X_PATHNAME_HEADER, pathname)
  return response
}

export const config = {
  // Exclude /api so API routes (e.g. POST /api/auth/login) are not touched by web middleware.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)'],
}
