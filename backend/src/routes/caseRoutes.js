import express from "express";
import {
    createCase,
    getCases,
    updateCaseStatus
} from "../controller/caseController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const caseRouter = express.Router();

/**
 * Case routes
 *
 * Handles creation, retrieval, and status updates
 * for legal cases with role-based access control.
 */

/**
 * POST /
 *
 * Create a new case.
 * Accessible only to advocates.
 */
caseRouter.post(
    "/",
    protect,
    requireRole("advocate"),
    createCase
);

/**
 * GET /
 *
 * Retrieve cases based on user role:
 * - Advocates / junior advocates: assigned cases
 * - Clients: their own cases
 */
caseRouter.get(
    "/",
    protect,
    getCases
);

/**
 * PATCH /:caseId/status
 *
 * Update the status of a case.
 * Accessible only to the advocate assigned to the case.
 */
caseRouter.patch(
    "/:caseId/status",
    protect,
    requireRole("advocate"),
    updateCaseStatus
);

// Export case router for mounting under /api/cases (or similar)
export default caseRouter;
