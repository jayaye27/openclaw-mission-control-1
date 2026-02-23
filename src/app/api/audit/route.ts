import { NextRequest, NextResponse } from 'next/server'
import { verifySessionApi } from '@/lib/dal'
import { readAuditEvents } from '@/lib/audit/storage'
import type { AuditCategory } from '@/lib/audit/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/audit - Retrieve audit log entries
 *
 * Query parameters:
 *   - limit: Maximum number of events (default: 100, max: 500)
 *   - offset: Number of events to skip (default: 0)
 *   - category: Filter by category (auth, agent, config, admin)
 *   - after: Filter events after this timestamp (Unix ms)
 *   - before: Filter events before this timestamp (Unix ms)
 *
 * Response:
 *   {
 *     events: AuditEvent[],
 *     total: number,
 *     limit: number,
 *     offset: number
 *   }
 *
 * Security:
 *   - Requires authenticated session (DAL pattern - CVE-2025-29927 mitigation)
 *   - Returns 401 if not authenticated
 */
export async function GET(request: NextRequest) {
  // DAL-level auth check - CVE-2025-29927 mitigation
  const session = await verifySessionApi()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  // Parse and validate limit (default 100, max 500)
  let limit = parseInt(searchParams.get('limit') || '100', 10)
  if (isNaN(limit) || limit < 1) limit = 100
  if (limit > 500) limit = 500

  // Parse offset (default 0)
  let offset = parseInt(searchParams.get('offset') || '0', 10)
  if (isNaN(offset) || offset < 0) offset = 0

  // Parse optional category filter
  const categoryParam = searchParams.get('category')
  const validCategories: AuditCategory[] = ['auth', 'agent', 'config', 'admin']
  const category = categoryParam && validCategories.includes(categoryParam as AuditCategory)
    ? (categoryParam as AuditCategory)
    : undefined

  // Parse optional time range filters
  const afterParam = searchParams.get('after')
  const after = afterParam ? parseInt(afterParam, 10) : undefined
  const validAfter = after !== undefined && !isNaN(after) ? after : undefined

  const beforeParam = searchParams.get('before')
  const before = beforeParam ? parseInt(beforeParam, 10) : undefined
  const validBefore = before !== undefined && !isNaN(before) ? before : undefined

  try {
    const result = await readAuditEvents({
      limit,
      offset,
      category,
      after: validAfter,
      before: validBefore,
    })

    return NextResponse.json({
      events: result.events,
      total: result.total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[api/audit] Error reading audit events:', error)
    return NextResponse.json(
      { error: 'Failed to read audit events' },
      { status: 500 }
    )
  }
}
