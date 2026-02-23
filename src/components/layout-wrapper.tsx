'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AppShell } from '@/components/app-shell'

/**
 * Routes that should render without the AppShell (sidebar, header, etc.)
 * These are public/auth routes that don't require authentication
 */
const publicRoutes = ['/login', '/setup']

/**
 * LayoutWrapper conditionally renders AppShell based on current route.
 * Public routes (login, setup) render without the dashboard chrome.
 */
export function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (isPublicRoute) {
    return <>{children}</>
  }

  return <AppShell>{children}</AppShell>
}
