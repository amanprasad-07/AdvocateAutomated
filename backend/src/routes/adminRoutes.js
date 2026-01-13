import express from "express";
import {
    approveAdvocate,
    getAdminDashboardStats,
    getAllCasesForAdmin,
    getAllUsers,
    getAuditLogs,
    getPendingAdvocates,
    getVerifiedAdvocates,
    rejectAdvocate,
    toggleUserActiveStatus,
} from "../controller/adminController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const adminRouter = express.Router();

/**
 * Admin Routes
 *
 * All routes defined in this router are:
 * - Protected by authentication middleware
 * - Restricted to users with the "admin" role
 *
 * This router provides administrative oversight,
 * moderation, and audit-related endpoints.
 */

// Apply authentication and admin-only authorization to all routes
adminRouter.use(protect, requireRole("admin"));

/**
 * GET /dashboard-stats
 *
 * Returns high-level system statistics for the admin dashboard.
 */
adminRouter.get("/dashboard-stats", getAdminDashboardStats);

/**
 * GET /pending-advocates
 *
 * Retrieves advocates and junior advocates
 * whose verification status is pending review.
 */
adminRouter.get("/pending-advocates", getPendingAdvocates);

/**
 * PATCH /pending-advocates/:userId/approve
 *
 * Approves an advocate or junior advocate
 * after administrative verification.
 */
adminRouter.patch("/pending-advocates/:userId/approve", approveAdvocate);

/**
 * PATCH /pending-advocates/:userId/reject
 *
 * Rejects an advocate or junior advocate
 * with a provided rejection reason.
 */
adminRouter.patch("/pending-advocates/:userId/reject", rejectAdvocate);

/**
 * GET /verified-advocates
 *
 * Retrieves all approved advocates and junior advocates.
 */
adminRouter.get("/verified-advocates", getVerifiedAdvocates);

/**
 * GET /users
 *
 * Retrieves all users for administrative oversight.
 */
adminRouter.get("/users", getAllUsers);

/**
 * PATCH /users/:userId/toggle-active
 *
 * Activates or deactivates a user account (soft block/unblock).
 */
adminRouter.patch("/users/:userId/toggle-active", toggleUserActiveStatus);

/**
 * GET /cases
 *
 * Retrieves all cases in a read-only mode,
 * with optional filtering handled at the controller level.
 */
adminRouter.get("/cases", getAllCasesForAdmin);

/**
 * GET /audit-logs
 *
 * Retrieves recent audit log entries for administrative review.
 */
adminRouter.get("/audit-logs", getAuditLogs);

// Export admin router for mounting under /api/admin (or similar)
export default adminRouter;
