import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const url = new URL('/auth/login', request.url)
  const response = NextResponse.redirect(url, { status: 303 })
  response.cookies.set('access_token', '', { path: '/', maxAge: 0 })
  response.cookies.set('refresh_token', '', { path: '/', maxAge: 0 })
  return response
}
