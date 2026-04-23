import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Updates the session in middleware and returns the response
 * This should be called in the root middleware.ts file
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    return { supabase: null, user: null, response: supabaseResponse }
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        request.cookies.set(name, value)
        supabaseResponse = NextResponse.next({
          request,
        })
        supabaseResponse.cookies.set(name, value, options)
      },
      remove(name: string, _options: Record<string, unknown>) {
        request.cookies.delete(name)
        supabaseResponse = NextResponse.next({
          request,
        })
        supabaseResponse.cookies.delete(name)
      },
    },
  })

  // Refresh session if expired - this is important!
  let user: { id: string } | null = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error && data?.user) user = data.user
  } catch (err) {
    // Supabase down (520/521) returns HTML; auth client throws on parse or TypeError on session string → treat as no user
    const msg = err instanceof Error ? err.message : String(err)
    if (
      msg.includes("Unexpected token '<'") ||
      msg.includes('is not valid JSON') ||
      msg.includes('<!DOCTYPE') ||
      msg.includes("Cannot create property 'user' on string")
    ) {
      // Supabase/Cloudflare issue; avoid log noise
    } else {
      console.error('[Auth middleware] getUser failed:', msg)
    }
  }

  return { supabase, user, response: supabaseResponse }
}

/** Profile fields used by auth middleware for route protection and app isolation */
interface MiddlewareProfile {
  profile_type: string
  approval_status: string
}

/**
 * Route protection configuration
 */
export interface RouteConfig {
  public: string[]
  protected: string[]
  roleRoutes: Record<string, string[]>
}

const defaultRouteConfig: RouteConfig = {
  public: [
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/callback',
    '/auth/session',
    '/auth/verify',
    '/auth/pending-approval',
    '/auth/access-denied',
    '/',
    '/about',
    '/pricing',
    '/contact',
  ],
  protected: [
    '/platform-owner',
    '/school-admin',
    '/teacher',
    '/dashboard',
    '/settings',
  ],
  roleRoutes: {
    platform_owner: ['/platform-owner'],
    school_superadmin: ['/school-admin'],
    teacher: ['/teacher'],
  },
}

/**
 * Create middleware handler with route protection
 */
export function createAuthMiddleware(config: Partial<RouteConfig> = {}) {
  const routeConfig: RouteConfig = { 
    ...defaultRouteConfig, 
    public: [...defaultRouteConfig.public, ...(config.public || [])],
    protected: config.protected || defaultRouteConfig.protected,
    roleRoutes: { ...defaultRouteConfig.roleRoutes, ...config.roleRoutes },
  }

  return async function middleware(request: NextRequest) {
    const { user, response, supabase } = await updateSession(request)
    const { pathname } = request.nextUrl

    // Check if route is public
    const isPublicRoute = routeConfig.public.some(
      (route) => pathname === route || pathname.startsWith(route + '/')
    )

    if (isPublicRoute) {
      return response
    }

    // Check if route requires authentication
    const isProtectedRoute = routeConfig.protected.some(
      (route) => pathname.startsWith(route)
    )

    // No user = redirect to login
    if (isProtectedRoute && !user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // If authenticated, check role-based access
    if (user && supabase) {
      const { data: rawProfile } = await supabase
        .from('profiles')
        .select('profile_type, approval_status')
        .eq('user_id', user.id)
        .single()

      const profile = rawProfile as MiddlewareProfile | null
      if (profile) {
        // Check if user is approved
        if (profile.approval_status === 'pending') {
          if (pathname !== '/auth/pending-approval') {
            const pendingUrl = new URL('/auth/pending-approval', request.url)
            return NextResponse.redirect(pendingUrl)
          }
          return response
        }

        if (profile.approval_status === 'rejected') {
          if (pathname !== '/auth/access-denied') {
            const rejectedUrl = new URL('/auth/access-denied', request.url)
            return NextResponse.redirect(rejectedUrl)
          }
          return response
        }

        // Check role-based routes
        const allowedRoutes = routeConfig.roleRoutes[profile.profile_type] || []

        // If trying to access a role-specific route
        for (const [role, routes] of Object.entries(routeConfig.roleRoutes)) {
          if (routes.some((route) => pathname.startsWith(route))) {
            if (role !== profile.profile_type) {
              // Redirect to their own dashboard
              const dashboardUrl = new URL(
                allowedRoutes[0] || '/dashboard',
                request.url
              )
              return NextResponse.redirect(dashboardUrl)
            }
          }
        }
      }
    }

    return response
  }
}

/**
 * Helper to check if user has required role
 */
export function hasRole(
  profileType: string | null,
  allowedRoles: string[]
): boolean {
  if (!profileType) return false
  return allowedRoles.includes(profileType)
}

/**
 * Get redirect URL based on profile type
 */
export function getRedirectUrl(profileType: string): string {
  switch (profileType) {
    case 'platform_owner':
      return '/platform-owner'
    case 'school_superadmin':
      return '/school-admin'
    case 'teacher':
      return '/teacher'
    default:
      return '/dashboard'
  }
}
