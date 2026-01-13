import express from "express";
import { getAdvocateDashboard } from "../controller/advocateController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const advocateRouter = express.Router();

/**
 * Advocate Routes
 *
 * Contains routes related to advocate-specific
 * dashboards and functionality.
 */

/**
 * GET /dashboard
 *
 * Returns dashboard data for advocates.
 * Authentication is required.
 * Verification status is not enforced for this endpoint.
 */
advocateRouter.get(
    "/dashboard",
    protect,
    requireRole("advocate"),
    getAdvocateDashboard
);

// Export advocate router for mounting under /api/advocate (or similar)
export default advocateRouter;
