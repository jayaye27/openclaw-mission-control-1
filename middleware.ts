import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for optimistic route protection (defense in depth)
 *
 * IMPORTANT: This middleware is NOT the sole protection layer.
 * Real authentication happens at the DAL level via verifySession()
 * in protected layouts and verifySessionApi() in API routes.
 *
 * CVE-2025-29927 demonstrated that middleware can be bypassed via
 * x-middleware-subrequest header manipulation. Therefore:
 * - This middleware provides fast UX (immediate redirect without page load)
 * - DAL functions provide actual security (cannot be bypassed)
 *
 * Cookie check is optimistic - we only check if the cookie EXISTS,
 * not if it's valid. Validation happens at the DAL level.
 */
export function middleware(request: NextRequest) {
  const session = request.cookies.get('alfo-claw-session')
  const { pathname } = request.nextUrl

  // Public paths that don't require auth
  // API routes handle their own auth via verifySessionApi() - let them through
  const publicPaths = ['/login', '/api/', '/setup']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // Static assets and Next.js internals are always public
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // If no session cookie and trying to access protected route
  if (!session && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If has session and trying to access login, redirect to home
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.png$).*)',
  ],
}
