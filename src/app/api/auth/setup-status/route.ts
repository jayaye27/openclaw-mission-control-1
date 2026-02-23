import { NextResponse } from 'next/server'
import { isFirstRun } from '@/lib/auth/token'

/**
 * GET /api/auth/setup-status
 * Check if setup has been completed
 */
export async function GET() {
  const firstRun = await isFirstRun()
  return NextResponse.json({ isConfigured: !firstRun })
}
