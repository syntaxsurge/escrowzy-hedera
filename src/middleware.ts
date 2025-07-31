import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { apiEndpoints, httpHeaders } from '@/config/api-endpoints'
import { appRoutes, timeConstants } from '@/config/app-routes'
import { envEdge } from '@/config/env.edge'
import { addSecurityHeaders } from '@/lib/auth/security-headers'
import { signToken, verifyToken } from '@/lib/auth/session'

const protectedRoutes = [
  appRoutes.dashboard.base,
  appRoutes.chat.base,
  appRoutes.trades.base,
  appRoutes.battles.base,
  appRoutes.battleArena,
  appRoutes.rewards.base,
  appRoutes.admin.base
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('session')
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )
  const isApiRoute = pathname.startsWith('/api/')

  // For protected routes, validate session immediately
  if (
    isProtectedRoute ||
    (isApiRoute && pathname !== apiEndpoints.user.profile)
  ) {
    if (!sessionCookie) {
      // No session cookie - redirect to home for UI routes, return 401 for API
      if (isApiRoute) {
        return NextResponse.json(
          { error: 'Unauthorized - Authentication required' },
          { status: 401 }
        )
      }
      return NextResponse.redirect(new URL(appRoutes.home, request.url))
    }

    // Validate the session token
    try {
      const sessionData = await verifyToken(sessionCookie.value)

      // Check if session is expired
      if (!sessionData || !sessionData.expires) {
        throw new Error('Invalid session data')
      }

      const expiryDate = new Date(sessionData.expires)
      if (expiryDate < new Date()) {
        throw new Error('Session expired')
      }

      // Check required session fields
      if (
        !sessionData.user ||
        typeof sessionData.user.id !== 'number' ||
        !sessionData.sessionToken
      ) {
        throw new Error('Invalid session structure')
      }

      // For protected routes, we'll validate against DB in server components
      // Here we just ensure the JWT is valid

      // Refresh session cookie with new expiry
      let res = NextResponse.next()
      const expiresInOneDay = new Date(Date.now() + timeConstants.DAY)
      const isProduction = envEdge.isProduction

      res.cookies.set({
        name: 'session',
        value: await signToken({
          ...sessionData,
          expires: expiresInOneDay.toISOString()
        }),
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        expires: expiresInOneDay,
        path: '/'
      })

      // Add session data to request headers for server components
      res.headers.set(
        httpHeaders.session.userId,
        sessionData.user.id.toString()
      )
      res.headers.set(httpHeaders.session.token, sessionData.sessionToken)

      // Add security headers
      res = addSecurityHeaders(res)

      return res
    } catch (_error) {
      // Invalid session - clear cookie and redirect/401
      const res = isApiRoute
        ? NextResponse.json(
            { error: 'Invalid or expired session' },
            { status: 401 }
          )
        : NextResponse.redirect(new URL(appRoutes.home, request.url))

      res.cookies.delete('session')
      return res
    }
  }

  // For non-protected routes, try to refresh session if it exists
  if (sessionCookie && !isApiRoute) {
    try {
      const parsed = await verifyToken(sessionCookie.value)
      const expiresInOneDay = new Date(Date.now() + timeConstants.DAY)
      const isProduction = envEdge.isProduction

      let res = NextResponse.next()
      res.cookies.set({
        name: 'session',
        value: await signToken({
          ...parsed,
          expires: expiresInOneDay.toISOString()
        }),
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        expires: expiresInOneDay,
        path: '/'
      })
      return addSecurityHeaders(res)
    } catch (_error) {
      // Invalid session on non-protected route - just clear it
      const res = NextResponse.next()
      res.cookies.delete('session')
      return addSecurityHeaders(res)
    }
  }

  // Add security headers to all responses
  const res = NextResponse.next()
  return addSecurityHeaders(res)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs'
}
