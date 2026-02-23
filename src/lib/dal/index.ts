import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/auth/session'

/**
 * Verified session data returned by verifySession functions
 */
export interface VerifiedSession {
  isAuth: true
  userId: string
  firstName: string
  lastName: string
  email: string
}

/**
 * Verify session and redirect to /login if not authenticated
 * Use in Server Components and Server Actions for protected routes
 *
 * Uses React cache() for request deduplication - multiple calls in the same
 * request only hit the session once.
 *
 * CRITICAL: This is the primary auth check for CVE-2025-29927 mitigation.
 * Call this in every data access function, not just middleware.
 */
export const verifySession = cache(async (): Promise<VerifiedSession> => {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (!session.isAuthenticated) {
    redirect('/login')
  }

  // Refresh session (sliding window - extends cookie expiration)
  await session.save()

  return {
    isAuth: true,
    userId: session.userId,
    firstName: session.firstName,
    lastName: session.lastName,
    email: session.email,
  }
})

/**
 * Verify session for API routes - returns null instead of redirecting
 * Use in API route handlers that should return 401 status
 *
 * Uses React cache() for request deduplication.
 */
export const verifySessionApi = cache(async (): Promise<VerifiedSession | null> => {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (!session.isAuthenticated) {
    return null
  }

  // Refresh session (sliding window - extends cookie expiration)
  await session.save()

  return {
    isAuth: true,
    userId: session.userId,
    firstName: session.firstName,
    lastName: session.lastName,
    email: session.email,
  }
})
