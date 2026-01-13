import express from "express";
import {
    createCase,
    getCases,
    getCaseById,
    updateCaseStatus
} from "../controller/caseController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const caseRouter = express.Router();

/**
 * Case Routes
 *
 * Defines endpoints for creating, retrieving,
 * and managing legal cases with role-based access control.
 */

/**
 * POST /
 *
 * Creates a new case from an approved appointment.
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
 * Retrieves cases based on user role:
 * - Advocates and junior advocates: cases assigned to them
 * - Clients: cases belonging to them
 */
caseRouter.get(
    "/",
    protect,
    getCases
);

/**
 * PATCH /:caseId/status
 *
 * Updates the lifecycle status of a case.
 * Accessible only to the advocate assigned to the case.
 */
caseRouter.patch(
    "/:caseId/status",
    protect,
    requireRole("advocate"),
    updateCaseStatus
);

/**
 * GET /:caseId
 *
 * Retrieves a single case by ID
 * with role-based access enforcement.
 */
caseRouter.get(
  "/:caseId",
  protect,
  getCaseById
);

// Export case router for mounting under /api/cases (or similar)
export default caseRouter;
