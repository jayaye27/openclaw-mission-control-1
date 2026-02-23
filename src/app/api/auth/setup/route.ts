import { NextRequest, NextResponse } from 'next/server'
import {
  generateSecureToken,
  hashToken,
  saveAdminConfig,
  isFirstRun,
} from '@/lib/auth/token'
import { getSession } from '@/lib/auth/session'

/**
 * POST /api/auth/setup
 * Complete first-run setup: generate token, hash it, save config
 * Returns plaintext token ONCE for user to save
 */
export async function POST(request: NextRequest) {
  try {
    // Check if setup already completed
    const firstRun = await isFirstRun()
    if (!firstRun) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { firstName, lastName, email } = body

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

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    // Generate secure token (32 bytes = 256 bits entropy)
    const token = generateSecureToken(32)

    // Hash the token using argon2id
    const tokenHash = await hashToken(token)

    // Generate session secret
    const sessionSecret = generateSecureToken(32)

    // Save config to .env.local
    await saveAdminConfig({
      tokenHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      sessionSecret,
    })

    // Create session immediately (auto-login after setup)
    // This works because we're in the same request context before the server restarts
    const session = await getSession()
    session.isAuthenticated = true
    session.userId = 'admin'
    session.firstName = firstName.trim()
    session.lastName = lastName.trim()
    session.email = email.trim()
    session.loginAt = Date.now()
    await session.save()

    // Return plaintext token (ONLY time it's ever returned)
    return NextResponse.json({
      token,
      message: 'Setup completed successfully. Save your token securely.',
    })
  } catch (error) {
    console.error('Setup failed:', error)
    return NextResponse.json(
      { error: 'Setup failed' },
      { status: 500 }
    )
  }
}
