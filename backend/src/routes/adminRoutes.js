import express from "express";
import {
    approveAdvocate,
    getPendingAdvocates,
    rejectAdvocate,
} from "../controller/adminController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const adminRouter = express.Router();

/**
 * Admin routes
 *
 * All routes below are protected and accessible
 * only to users with the "admin" role.
 */

// Apply authentication and role-based authorization
adminRouter.use(protect, requireRole("admin"));

/**
 * GET /pending-advocates
 *
 * Retrieves all advocates and junior advocates
 * whose verification status is pending.
 */
adminRouter.get("/pending-advocates", getPendingAdvocates);

/**
 * PATCH /advocates/:userId/approve
 *
 * Approves an advocate or junior advocate
 * after admin verification.
 */
adminRouter.patch("/advocates/:userId/approve", approveAdvocate);

/**
 * PATCH /advocates/:userId/reject
 *
 * Rejects an advocate or junior advocate
 * after admin review.
 */
adminRouter.patch("/advocates/:userId/reject", rejectAdvocate);

// Export admin router for mounting under /api/admin (or similar)
export default adminRouter;
