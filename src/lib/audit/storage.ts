import 'server-only'
import { mkdir, appendFile, readFile } from 'fs/promises'
import { join } from 'path'
import { getOpenClawHome } from '@/lib/paths'
import type { AuditEvent, AuditCategory } from './types'

/**
 * Get the path to the audit log directory.
 */
function getAuditDir(): string {
  return join(getOpenClawHome(), 'audit')
}

/**
 * Get the path to the audit log file.
 */
function getAuditLogPath(): string {
  return join(getAuditDir(), 'audit.log')
}

/**
 * Ensure the audit directory exists.
 */
async function ensureAuditDir(): Promise<void> {
  await mkdir(getAuditDir(), { recursive: true })
}

/**
 * Append an audit event to the NDJSON log file.
 *
 * This function handles errors gracefully and never throws.
 * Events are stored as newline-delimited JSON (NDJSON) for efficient append operations.
 *
 * @param event - The audit event to append
 */
export async function appendAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await ensureAuditDir()
    const line = JSON.stringify(event) + '\n'
    await appendFile(getAuditLogPath(), line, 'utf-8')
  } catch (error) {
    // Log to console but don't throw - audit logging should never break the app
    console.error('[audit] Failed to write audit event:', error)
  }
}

/**
 * Options for reading audit events.
 */
export interface ReadAuditOptions {
  /** Maximum number of events to return (default: 100) */
  limit?: number
  /** Number of events to skip for pagination (default: 0) */
  offset?: number
  /** Filter by category */
  category?: AuditCategory
  /** Filter events after this timestamp (Unix ms) */
  after?: number
  /** Filter events before this timestamp (Unix ms) */
  before?: number
}

/**
 * Result from reading audit events.
 */
export interface ReadAuditResult {
  /** The matching audit events */
  events: AuditEvent[]
  /** Total number of events matching filters (before pagination) */
  total: number
}

/**
 * Read audit events from the NDJSON log file.
 *
 * Events are returned in descending timestamp order (most recent first).
 * Filters are applied before pagination.
 *
 * @param options - Reading options (limit, offset, filters)
 * @returns Object containing events array and total count
 */
export async function readAuditEvents(options: ReadAuditOptions = {}): Promise<ReadAuditResult> {
  const {
    limit = 100,
    offset = 0,
    category,
    after,
    before,
  } = options

  try {
    const content = await readFile(getAuditLogPath(), 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    // Parse NDJSON lines
    const events: AuditEvent[] = []
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as AuditEvent
        events.push(event)
      } catch {
        // Skip malformed lines
        console.error('[audit] Skipping malformed audit log line')
      }
    }

    // Apply filters
    let filtered = events

    if (category) {
      filtered = filtered.filter(e => e.category === category)
    }

    if (after !== undefined) {
      filtered = filtered.filter(e => e.timestamp > after)
    }

    if (before !== undefined) {
      filtered = filtered.filter(e => e.timestamp < before)
    }

    // Sort by timestamp descending (most recent first)
    filtered.sort((a, b) => b.timestamp - a.timestamp)

    // Get total before pagination
    const total = filtered.length

    // Apply pagination
    const paginated = filtered.slice(offset, offset + limit)

    return {
      events: paginated,
      total,
    }
  } catch (error) {
    // Handle file not found or other read errors gracefully
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // No audit log yet - return empty
      return { events: [], total: 0 }
    }

    console.error('[audit] Failed to read audit events:', error)
    return { events: [], total: 0 }
  }
}
