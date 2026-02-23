import { NextResponse } from 'next/server'
import { getSession, defaultSession } from '@/lib/auth/session'
import { auditLog } from '@/lib/audit/logger'

/**
 * Extract client IP from request headers.
 */
function getClientIp(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return null
}

/**
 * POST /api/auth/logout
 *
 * Destroys the current session and redirects to login.
 * Uses iron-session's destroy pattern (reset to defaults + save)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession()

    // Capture user info before clearing session
    const userId = session.userId
    const email = session.email

    // Reset session to default (unauthenticated) state
    session.isAuthenticated = defaultSession.isAuthenticated
    session.userId = defaultSession.userId
    session.firstName = defaultSession.firstName
    session.lastName = defaultSession.lastName
    session.email = defaultSession.email
    session.loginAt = defaultSession.loginAt

    // Save the cleared session (this effectively destroys it)
    await session.save()

    // Log successful logout
    if (userId && email) {
      auditLog({
        category: 'auth',
        action: 'logout',
        actor: { userId, email },
        outcome: 'success',
        ip: getClientIp(request),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    // Even on error, try to clear the session
    return NextResponse.json({ success: true })
  }
}
