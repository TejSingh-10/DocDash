import AuditLog from '../models/AuditLog.js';

// ---------------------------------------------------------------------------
// logAudit — write a single audit entry
// ---------------------------------------------------------------------------

/**
 * Persists an audit log entry.
 *
 * Failures are intentionally NOT thrown — a logging failure must never break
 * the main request/response flow. Callers that need to handle logging errors
 * should await this and catch explicitly.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {'READ'|'LIST'|'CREATE'|'UPDATE'|'ARCHIVE'} action
 * @param {string} resourceType — Mongoose model name, e.g. 'MedicalRecord'
 * @param {string|import('mongoose').Types.ObjectId|null} resourceId
 * @param {object} [metadata]
 */
export async function logAudit(userId, action, resourceType, resourceId, metadata) {
  try {
    await AuditLog.create({ user: userId, action, resourceType, resourceId, metadata });
  } catch (err) {
    // Log to stderr but never re-throw — audit is best-effort, not transactional.
    console.error('[AuditLog] Failed to write entry:', err.message, {
      userId, action, resourceType, resourceId,
    });
  }
}

// ---------------------------------------------------------------------------
// withAudit — the "un-skippable" wrapper
// ---------------------------------------------------------------------------
//
// PURPOSE: Ensure that every auditable record operation logs an audit entry.
//
// ENFORCEMENT PATTERN:
//   All route handlers for /api/records must obtain their result by calling
//   `withAudit(auditParams, operationFn)` rather than performing DB operations
//   directly. Because the result of the operation is only returned through this
//   wrapper, a developer cannot accidentally omit the audit call — if they skip
//   the wrapper, they also skip the operation itself.
//
// ADDING NEW RECORD ROUTES:
//   1. Define your auditParams (userId, action, resourceType, resourceId, metadata).
//   2. Wrap your DB work in `withAudit(auditParams, async () => { ... })`.
//   3. The audit entry is written automatically after the operation succeeds.
//
//   Do NOT call `logAudit` directly from record route handlers — use this wrapper
//   so that the pairing of "operation + audit" is atomic from the handler's POV.
//
// ---------------------------------------------------------------------------

/**
 * Executes `operationFn`, then writes an audit log entry for the result.
 *
 * `auditParams.resourceId` may be a function `(result) => id` for cases where
 * the resource ID is only known after the operation (e.g. CREATE returns the
 * new document's _id).
 *
 * @template T
 * @param {{
 *   userId: string,
 *   action: 'READ'|'LIST'|'CREATE'|'UPDATE'|'ARCHIVE',
 *   resourceType: string,
 *   resourceId: string | null | ((result: T) => string | null),
 *   metadata?: object
 * }} auditParams
 * @param {() => Promise<T>} operationFn
 * @returns {Promise<T>}
 */
export async function withAudit(auditParams, operationFn) {
  const result = await operationFn();

  const resolvedResourceId =
    typeof auditParams.resourceId === 'function'
      ? auditParams.resourceId(result)
      : auditParams.resourceId;

  // Audit is written AFTER a successful operation. If operationFn throws,
  // the audit is not written — which is correct: a failed operation should
  // not be logged as if it succeeded.
  await logAudit(
    auditParams.userId,
    auditParams.action,
    auditParams.resourceType,
    resolvedResourceId,
    auditParams.metadata,
  );

  return result;
}
