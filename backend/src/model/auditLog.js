import mongoose from "mongoose";

/**
 * Audit Log Schema
 *
 * Immutable record of critical system events
 * for accountability and compliance.
 */
const auditLogSchema = new mongoose.Schema(
  {
    // Type of action performed
    action: {
      type: String,
      required: true,
      trim: true,
    },

    // Entity affected (case, task, payment, user, evidence)
    entityType: {
      type: String,
      required: true,
      trim: true,
    },

    // ID of the affected entity
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // User who performed the action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Optional contextual message
    message: {
      type: String,
      trim: true,
    },

    // Optional metadata snapshot
    metadata: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("AuditLog", auditLogSchema);
