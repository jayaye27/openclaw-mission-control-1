'use client'

import { ReactNode } from 'react'
import { useTaskPickup } from '@/hooks/use-task-pickup'

/**
 * Provider component that enables automatic task pickup.
 * Runs every 3 minutes to delegate backlog tasks to agents.
 *
 * Only wrap authenticated routes with this provider.
 */
export function TaskPickupProvider({ children }: { children: ReactNode }) {
  useTaskPickup()
  return <>{children}</>
}
