import 'server-only'

/**
 * Lockout record for tracking failed authentication attempts
 */
interface LockoutRecord {
  attempts: number
  firstAttempt: number
  lockedUntil: number | null
}

/**
 * In-memory storage for lockout records
 * Keyed by identifier (typically email or IP)
 */
const lockouts = new Map<string, LockoutRecord>()

/**
 * Maximum failed attempts before lockout
 */
const MAX_ATTEMPTS = 5

/**
 * Lockout duration in milliseconds (15 minutes)
 */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

/**
 * Window for counting attempts in milliseconds (15 minutes)
 */
const WINDOW_MS = 15 * 60 * 1000

/**
 * Check lockout status result
 */
export interface LockoutStatus {
  locked: boolean
  retriesLeft?: number
}

/**
 * Check if an identifier is currently locked out
 * @param identifier - Email, IP, or other unique identifier
 * @returns Lockout status with retries remaining if not locked
 */
export function checkLockout(identifier: string): LockoutStatus {
  const record = lockouts.get(identifier)
  const now = Date.now()

  // No record = never attempted
  if (!record) {
    return { locked: false, retriesLeft: MAX_ATTEMPTS }
  }

  // Check if still locked
  if (record.lockedUntil && now < record.lockedUntil) {
    return { locked: true }
  }

  // Check if window expired (reset attempts)
  if (now - record.firstAttempt > WINDOW_MS) {
    lockouts.delete(identifier)
    return { locked: false, retriesLeft: MAX_ATTEMPTS }
  }

  // Within window, calculate retries left
  return { locked: false, retriesLeft: MAX_ATTEMPTS - record.attempts }
}

/**
 * Record failed attempt result
 */
export interface RecordAttemptResult {
  locked: boolean
}

/**
 * Record a failed authentication attempt
 * @param identifier - Email, IP, or other unique identifier
 * @returns Whether the identifier is now locked
 */
export function recordFailedAttempt(identifier: string): RecordAttemptResult {
  const now = Date.now()
  let record = lockouts.get(identifier)

  // Start new record if none exists or window expired
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    record = { attempts: 1, firstAttempt: now, lockedUntil: null }
  } else {
    // Increment attempts
    record.attempts++
    // Lock if max attempts reached
    if (record.attempts >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS
    }
  }

  lockouts.set(identifier, record)
  return { locked: record.lockedUntil !== null }
}

/**
 * Clear lockout record for an identifier (on successful auth)
 * @param identifier - Email, IP, or other unique identifier
 */
export function clearLockout(identifier: string): void {
  lockouts.delete(identifier)
}
