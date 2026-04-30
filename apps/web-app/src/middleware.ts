import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout')

  if (isPublic) return NextResponse.next()

  if (pathname.startsWith('/app')) {
    const accessToken = request.cookies.get('access_token')?.value
    if (!accessToken) {
      const loginUrl = new URL('/auth/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
