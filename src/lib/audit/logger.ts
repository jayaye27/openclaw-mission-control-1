import 'server-only'
import { appendAuditEvent } from './storage'
import type { AuditEvent, AuditCategory, AuditOutcome, AuditActor } from './types'

/**
 * Parameters for creating an audit log entry.
 */
export interface AuditLogParams {
  /** Category of the operation */
  category: AuditCategory
  /** Specific action performed (e.g., 'login', 'agent.start', 'config.update') */
  action: string
  /** User who performed the action (optional for unauthenticated operations) */
  actor?: AuditActor | null
  /** Target of the action (optional) */
  target?: string | null
  /** Result of the operation */
  outcome: AuditOutcome
  /** Additional context and metadata (optional) */
  details?: Record<string, unknown>
  /** Client IP address (optional) */
  ip?: string | null
}

/**
 * Create and persist an audit log entry.
 *
 * This function uses fire-and-forget semantics - it does not wait for
 * the event to be written to disk. This ensures audit logging never
 * blocks the request flow.
 *
 * @param params - The audit log parameters
 * @returns The created AuditEvent (for chaining/testing)
 *
 * @example
 * ```ts
 * auditLog({
 *   category: 'auth',
 *   action: 'login',
 *   actor: { userId: session.userId, email: session.email },
 *   outcome: 'success',
 *   ip: request.headers.get('x-forwarded-for'),
 * })
 * ```
 */
export function auditLog(params: AuditLogParams): AuditEvent {
  const event: AuditEvent = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    category: params.category,
    action: params.action,
    actor: params.actor ?? null,
    target: params.target ?? null,
    outcome: params.outcome,
    details: params.details ?? {},
    ip: params.ip ?? null,
  }

  // Fire-and-forget: don't await the write
  // This ensures audit logging never blocks the request
  appendAuditEvent(event)

  return event
}
