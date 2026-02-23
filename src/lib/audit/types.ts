import 'server-only'

/**
 * Audit event categories for classifying logged operations.
 */
export type AuditCategory = 'auth' | 'agent' | 'config' | 'admin'

/**
 * Possible outcomes for audit events.
 */
export type AuditOutcome = 'success' | 'failure' | 'denied'

/**
 * Actor information for audit events.
 * Null for unauthenticated operations (e.g., failed login attempts).
 */
export interface AuditActor {
  userId: string
  email: string
}

/**
 * Audit event structure for logging security-relevant operations.
 *
 * Each event captures:
 * - WHO performed the action (actor)
 * - WHAT action was performed (category + action)
 * - WHEN it happened (timestamp)
 * - WHERE it originated (ip)
 * - ON WHAT target (target)
 * - WITH WHAT result (outcome)
 * - ADDITIONAL context (details)
 */
export interface AuditEvent {
  /** Unique event identifier (UUID v4) */
  id: string

  /** Unix timestamp in milliseconds */
  timestamp: number

  /** Category of the operation */
  category: AuditCategory

  /** Specific action performed (e.g., 'login', 'agent.start', 'config.update') */
  action: string

  /** User who performed the action, or null for unauthenticated operations */
  actor: AuditActor | null

  /** Target of the action (e.g., agent ID, config key), or null if not applicable */
  target: string | null

  /** Result of the operation */
  outcome: AuditOutcome

  /** Additional context and metadata */
  details: Record<string, unknown>

  /** Client IP address, or null if not available */
  ip: string | null
}
