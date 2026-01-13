import express from "express";
import {
  getAllAdvocates,
  getAllClients,
  getAllJuniors
} from "../controller/getUsersController.js";
import { protect } from "../middleware/authMiddleware.js";

const getUsersRouter = express.Router();

/**
 * User Listing Routes
 *
 * Provides role-specific user listings for
 * internal selection and assignment workflows.
 * All routes are protected and require authentication.
 */

/**
 * GET /getAdvocates
 *
 * Retrieves all approved advocates.
 * Intended for role-based selection such as
 * case assignment or appointment scheduling.
 */
getUsersRouter.get(
  "/getAdvocates",
  protect,
  getAllAdvocates
);

/**
 * GET /getClients
 *
 * Retrieves all client users.
 * Intended for internal workflows such as
 * case creation or appointment management.
 */
getUsersRouter.get(
  "/getClients",
  protect,
  getAllClients
);

/**
 * GET /getJuniors
 *
 * Retrieves all approved junior advocates.
 * Intended for assigning juniors to cases.
 */
getUsersRouter.get(
  "/getJuniors",
  protect,
  getAllJuniors
);

// Export router for mounting under /api/users (or similar)
export default getUsersRouter;
