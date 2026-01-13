import express from "express";
import {
    createTask,
    getTasksByCase,
    updateTaskStatus
} from "../controller/taskController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const taskRouter = express.Router();

/**
 * Task Routes
 *
 * Defines endpoints for task assignment,
 * retrieval, and status updates with
 * strict role-based access control.
 */

/**
 * POST /
 *
 * Assigns a new task to a junior advocate.
 * Accessible only to advocates.
 */
taskRouter.post(
    "/",
    protect,
    requireRole("advocate"),
    createTask
);

/**
 * GET /case/:caseId
 *
 * Retrieves tasks for a specific case.
 *
 * Access:
 * - Advocate who owns the case
 * - Junior advocates assigned to the case
 */
taskRouter.get(
  "/case/:caseId",
  protect,
  requireRole("advocate", "junior_advocate"),
  getTasksByCase
);

/**
 * PATCH /:taskId/status
 *
 * Updates the progress status of a task.
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
