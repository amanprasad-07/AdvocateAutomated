import express from "express";
import { getJuniorDashboard } from "../controller/juniorController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const juniorRouter = express.Router();

/**
 * Junior Advocate Routes
 *
 * Contains endpoints specific to
 * junior advocate dashboard functionality.
 */

/**
 * GET /dashboard
 *
 * Returns consolidated dashboard data for the
 * authenticated junior advocate, including
 * tasks, assigned cases, and uploaded evidence.
 */
juniorRouter.get(
    "/dashboard",
    protect,
    requireRole("junior_advocate"),
    getJuniorDashboard
);

// Export junior router for mounting under /api/junior (or similar)
export default juniorRouter;
