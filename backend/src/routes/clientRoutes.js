import express from "express";
import { getClientDashboard } from "../controller/clientController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const clientRouter = express.Router();

/**
 * Client routes
 *
 * Routes dedicated to client-facing dashboard functionality.
 */

/**
 * GET /dashboard
 *
 * Returns consolidated dashboard data for the authenticated client,
 * including cases, appointments, and payments.
 */
clientRouter.get(
    "/dashboard",
    protect,
    requireRole("client"),
    getClientDashboard
);

// Export client router for mounting under /api/client (or similar)
export default clientRouter;
