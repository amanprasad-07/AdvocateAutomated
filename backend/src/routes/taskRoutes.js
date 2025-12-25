import express from "express";
import {
    createTask,
    getTasks,
    updateTaskStatus
} from "../controller/taskController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const taskRouter = express.Router();

// Assign task
taskRouter.post(
    "/",
    protect,
    requireRole("advocate"),
    createTask
);

// View tasks
taskRouter.get(
    "/",
    protect,
    requireRole("advocate", "junior_advocate"),
    getTasks
);

// Update task status
taskRouter.patch(
    "/:taskId/status",
    protect,
    requireRole("junior_advocate"),
    updateTaskStatus
);

export default taskRouter;
