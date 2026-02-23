import { NextRequest, NextResponse } from 'next/server'
import {
  generateSecureToken,
  hashToken,
  saveAdminConfig,
  isFirstRun,
} from '@/lib/auth/token'
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
 * POST /api/auth/setup
 * Complete first-run setup: create admin with username/password
 * Returns a recovery token for password reset
 */
export async function POST(request: NextRequest) {
  try {
    // Check if setup already completed
    const firstRun = await isFirstRun()
    if (!firstRun) {
      auditLog({
        category: 'auth',
        action: 'setup.blocked',
        actor: null,
        outcome: 'denied',
        details: { reason: 'already_configured' },
        ip: getClientIp(request),
      })
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { firstName, lastName, email, username, password } = body

    // Validate inputs
    const errors: string[] = []

    if (!firstName || typeof firstName !== 'string' || firstName.trim() === '') {
      errors.push('First name is required')
    } else if (firstName.length > 50) {
      errors.push('First name must be 50 characters or less')
    }

    if (!lastName || typeof lastName !== 'string' || lastName.trim() === '') {
      errors.push('Last name is required')
    } else if (lastName.length > 50) {
      errors.push('Last name must be 50 characters or less')
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      errors.push('Email is required')
    } else if (!email.includes('@') || !email.includes('.')) {
      errors.push('Invalid email format')
    }

    if (!username || typeof username !== 'string' || username.trim() === '') {
      errors.push('Username is required')
    } else if (username.length < 3) {
      errors.push('Username must be at least 3 characters')
    } else if (username.length > 30) {
      errors.push('Username must be 30 characters or less')
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens')
    }

    if (!password || typeof password !== 'string') {
      errors.push('Password is required')
    } else if (password.length < 8) {
      errors.push('Password must be at least 8 characters')
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    // Hash the password using argon2id
    const passwordHash = await hashToken(password)

    // Generate recovery token (for password reset)
    const recoveryToken = generateSecureToken(32)
    const recoveryTokenHash = await hashToken(recoveryToken)

    // Generate session secret
    const sessionSecret = generateSecureToken(32)

    // Save config to .env.local
    await saveAdminConfig({
      username: username.trim().toLowerCase(),
      passwordHash,
      recoveryTokenHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      sessionSecret,
    })

    // Log successful setup (DO NOT log password or token values)
    auditLog({
      category: 'auth',
      action: 'setup.complete',
      actor: { userId: username.trim().toLowerCase(), email: email.trim() },
      outcome: 'success',
      details: { adminName: `${firstName.trim()} ${lastName.trim()}` },
      ip: getClientIp(request),
    })

    // Return recovery token (ONLY time it's ever returned)
    return NextResponse.json({
      recoveryToken,
      message: 'Setup completed successfully. Save your recovery token securely.',
    })
  } catch (error) {
    console.error('Setup failed:', error)
    return NextResponse.json(
      { error: 'Setup failed' },
      { status: 500 }
    )
  }
}
