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
 * Authenticates user with username and password.
 * - Uses generic error messages only ("Invalid credentials")
 * - 15-minute lockout after 5 failed attempts
 * - Creates 24-hour sliding window session on success
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body as { username?: string; password?: string }

    // Validate input
    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const normalizedUsername = username.trim().toLowerCase()

    // Check lockout status
    const lockoutId = normalizedUsername
    const lockoutStatus = checkLockout(lockoutId)
    if (lockoutStatus.locked) {
      auditLog({
        category: 'auth',
        action: 'login.lockout',
        actor: null,
        outcome: 'denied',
        details: { reason: 'too_many_attempts', username: normalizedUsername },
        ip: getClientIp(request),
      })
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Get stored credentials from environment
    const storedUsername = process.env.ADMIN_USERNAME
    const storedPasswordHash = process.env.ADMIN_PASSWORD_HASH

    if (!storedUsername || !storedPasswordHash) {
      // No admin configured - should redirect to setup
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check username first (case-insensitive)
    if (normalizedUsername !== storedUsername.toLowerCase()) {
      recordFailedAttempt(lockoutId)
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

    // Verify password against stored hash (timing-safe via argon2)
    const isValid = await verifyToken(password, storedPasswordHash)

    if (!isValid) {
      // Record failed attempt
      const result = recordFailedAttempt(lockoutId)

      if (result.locked) {
        auditLog({
          category: 'auth',
          action: 'login.lockout',
          actor: null,
          outcome: 'denied',
          details: { reason: 'too_many_attempts', username: normalizedUsername },
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
    session.userId = storedUsername
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
