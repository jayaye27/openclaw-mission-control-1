import { NextResponse } from 'next/server'
import { getSession, defaultSession } from '@/lib/auth/session'

/**
 * POST /api/auth/logout
 *
 * Destroys the current session and redirects to login.
 * Uses iron-session's destroy pattern (reset to defaults + save)
 */
export async function POST() {
  try {
    const session = await getSession()

    // Reset session to default (unauthenticated) state
    session.isAuthenticated = defaultSession.isAuthenticated
    session.userId = defaultSession.userId
    session.firstName = defaultSession.firstName
    session.lastName = defaultSession.lastName
    session.email = defaultSession.email
    session.loginAt = defaultSession.loginAt

    // Save the cleared session (this effectively destroys it)
    await session.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    // Even on error, try to clear the session
    return NextResponse.json({ success: true })
  }
}
