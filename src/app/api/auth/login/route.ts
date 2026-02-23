import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { verifyToken } from '@/lib/auth/token'
import { checkLockout, recordFailedAttempt, clearLockout } from '@/lib/auth/lockout'
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
 * POST /api/auth/login
 *
 * Authenticates user with admin token.
 * - Uses generic error messages only ("Invalid credentials")
 * - 15-minute lockout after 5 failed attempts
 * - Creates 24-hour sliding window session on success
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token } = body as { token?: string }

    // Validate input
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Use a consistent identifier for lockout tracking
    // In single-admin setup, use 'admin' as the identifier
    const lockoutId = 'admin'

    // Check lockout status
    const lockoutStatus = checkLockout(lockoutId)
    if (lockoutStatus.locked) {
      auditLog({
        category: 'auth',
        action: 'login.lockout',
        actor: null,
        outcome: 'denied',
        details: { reason: 'too_many_attempts' },
        ip: getClientIp(request),
      })
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Get stored hash from environment
    const storedHash = process.env.ADMIN_TOKEN_HASH
    if (!storedHash) {
      // No admin configured - should redirect to setup
      // Return generic error to avoid information disclosure
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify token against stored hash (timing-safe via argon2)
    const isValid = await verifyToken(token, storedHash)

    if (!isValid) {
      // Record failed attempt
      const result = recordFailedAttempt(lockoutId)

      if (result.locked) {
        auditLog({
          category: 'auth',
          action: 'login.lockout',
          actor: null,
          outcome: 'denied',
          details: { reason: 'too_many_attempts' },
          ip: getClientIp(request),
        })
        return NextResponse.json(
          { error: 'Too many failed attempts. Please try again later.' },
          { status: 429 }
        )
      }

      auditLog({
        category: 'auth',
        action: 'login.failure',
        actor: null,
        outcome: 'failure',
        details: { reason: 'invalid_credentials' },
        ip: getClientIp(request),
      })
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Success - clear any lockout record
    clearLockout(lockoutId)

    // Create session
    const session = await getSession()
    session.isAuthenticated = true
    session.userId = 'admin'
    session.firstName = process.env.ADMIN_FIRST_NAME || 'Admin'
    session.lastName = process.env.ADMIN_LAST_NAME || ''
    session.email = process.env.ADMIN_EMAIL || 'admin@local'
    session.loginAt = Date.now()
    await session.save()

    auditLog({
      category: 'auth',
      action: 'login.success',
      actor: { userId: session.userId!, email: session.email! },
      outcome: 'success',
      ip: getClientIp(request),
    })

    return NextResponse.json({
      success: true,
      user: {
        firstName: session.firstName,
        lastName: session.lastName,
        email: session.email,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }
}
