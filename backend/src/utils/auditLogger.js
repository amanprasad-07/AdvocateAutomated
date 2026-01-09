import AuditLog from "../model/auditLog.js";

/**
 * Centralized audit logging helper
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
    await AuditLog.create({
      action,
      entityType,
      entityId,
      performedBy,
      message,
      metadata,
    });
  } catch (err) {
    // Audit logs must NEVER break the main flow
    console.error("Audit log failed:", err.message);
  }
};
