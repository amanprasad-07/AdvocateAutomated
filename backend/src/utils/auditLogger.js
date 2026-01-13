import AuditLog from "../model/auditLog.js";

/**
 * Centralized Audit Logging Utility
 *
 * Records auditable system actions in a non-blocking manner.
 * Failures in audit logging must never interrupt
 * the primary application flow.
 */
export const logAuditEvent = async ({
  action,
  entityType,
  entityId,
  performedBy,
  message,
  metadata,
}) => {
  try {
    // Persist audit event with contextual metadata
    await AuditLog.create({
      action,
      entityType,
      entityId,
      performedBy,
      message,
      metadata,
    });
  } catch (err) {
    // Audit logging failures are intentionally non-fatal
    console.error("Audit log failed:", err.message);
  }
};
