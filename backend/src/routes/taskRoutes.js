import express from "express";
import {
    createTask,
    getTasksByCase,
    updateTaskStatus
} from "../controller/taskController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const taskRouter = express.Router();

/**
 * Task routes
 *
 * Handles task assignment, retrieval, and status updates
 * with strict role-based access control.
 */

/**
 * POST /
 *
 * Assign a new task to a junior advocate.
 * Accessible only to advocates.
 */
taskRouter.post(
    "/",
    protect,
    requireRole("advocate"),
    createTask
);

/**
 * GET /
 *
 * Retrieve tasks based on user role:
 * - Advocates: tasks they assigned
 * - Junior advocates: tasks assigned to them
 */

taskRouter.get(
  "/case/:caseId",
  protect,
  requireRole("advocate","junior_advocate"),
  getTasksByCase
);

/**
 * PATCH /:taskId/status
 *
 * Update task progress status.
 * Accessible only to the assigned junior advocate.
 */
taskRouter.patch(
    "/:taskId/status",
    protect,
    requireRole("junior_advocate"),
    updateTaskStatus
);

// Export task router for mounting under /api/tasks (or similar)
export default taskRouter;
