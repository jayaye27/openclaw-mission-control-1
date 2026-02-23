import 'server-only'
import { cookies } from 'next/headers'
import { getIronSession, SessionOptions } from 'iron-session'

/**
 * Session data stored in encrypted HttpOnly cookie
 */
export interface SessionData {
  isAuthenticated: boolean
  userId: string
  firstName: string
  lastName: string
  email: string
  loginAt: number
}

/**
 * Default session values (unauthenticated state)
 */
export const defaultSession: SessionData = {
  isAuthenticated: false,
  userId: '',
  firstName: '',
  lastName: '',
  email: '',
  loginAt: 0,
}

/**
 * iron-session configuration
 * - 32+ char password from SESSION_SECRET env var
 * - HttpOnly, SameSite=Lax cookies
 * - 24-hour sliding window expiration
 * - Secure only in production
 */
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'alfo-claw-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24, // 24 hours
  },
}

/**
 * Get the current session from cookies
 * Use iron-session v8 API: getIronSession(await cookies(), options)
 */
export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}
