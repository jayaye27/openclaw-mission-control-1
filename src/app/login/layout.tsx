import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
}

/**
 * Login page uses a minimal layout without sidebar/header
 * since user is not yet authenticated
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
