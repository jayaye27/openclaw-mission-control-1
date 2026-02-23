import { verifySession } from '@/lib/dal'

/**
 * Protected route group layout
 *
 * This layout wraps all authenticated pages. It verifies the session
 * at the DAL level (not just middleware) to ensure CVE-2025-29927
 * mitigation - authentication cannot be bypassed via header manipulation.
 *
 * If the session is invalid, verifySession() will redirect to /login.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This will redirect to /login if not authenticated
  // DAL-level auth check - cannot be bypassed like middleware
  await verifySession()

  return <>{children}</>
}
