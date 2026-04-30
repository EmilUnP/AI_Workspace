import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin
  // OAuth callback is no longer used after migration away from Supabase auth.
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_not_supported`)
}
