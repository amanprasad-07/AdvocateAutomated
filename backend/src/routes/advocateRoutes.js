import express from "express";
import { getAdvocateDashboard } from "../controller/advocateController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const advocateRouter = express.Router();

/**
 * Advocate routes
 *
 * Routes related to advocate and junior advocate dashboards
 * and role-specific functionality.
 */

/**
 * GET /dashboard
 *
 * Returns dashboard data for advocates and junior advocates.
 * Accessible even if verification is pending.
 */
advocateRouter.get(
    "/dashboard",
    protect,
    requireRole("advocate", "junior_advocate"),
    getAdvocateDashboard
);

// Export advocate router for mounting under /api/advocate (or similar)
export default advocateRouter;
