import Task from "../model/task.js";
import Case from "../model/case.js";
import { logAuditEvent } from "../utils/auditLogger.js";

/**
 * Create Task Controller
 *
 * Assigns a task to a junior advocate.
 * Tasks are always linked to a case and can only be
 * created by the advocate who owns the case.
 */
export const createTask = async (req, res, next) => {
    try {
        // Extract task details from request body
        const {
            title,
            description,
            caseId,
            assignedTo,
            priority,
            dueDate
        } = req.body;

        // Validate presence of mandatory fields
        if (!title || !caseId || !assignedTo) {
            const err = new Error("Missing required fields");
            err.statusCode = 400;
            return next(err);
        }

        // Verify that the referenced case exists
        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        // Ensure only the owning advocate can assign tasks
        if (existingCase.advocate.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        // Prevent task assignment on closed cases
        if (existingCase.status === "closed") {
            const err = new Error(
                "Case is completed. No further changes are allowed."
            );
            err.statusCode = 403;
            return next(err);
        }

        // Automatically move case from OPEN to IN_PROGRESS on first task creation
        if (existingCase.status === "open") {
            existingCase.status = "in_progress";
            await existingCase.save();
        }

        // Create the task record
        const task = await Task.create({
            title,
            description,
            case: caseId,
            assignedTo,
            assignedBy: req.user._id,
            priority,
            dueDate
        });

        // Ensure the junior advocate is registered against the case
        await Case.findByIdAndUpdate(
            caseId,
            {
                $addToSet: { assignedJuniors: assignedTo }, // prevents duplicate assignments
            },
            { new: true }
        );

        // Respond with task creation confirmation
        res.status(201).json({
            success: true,
            message: "Task assigned successfully",
            data: task
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};

/**
 * Get Tasks By Case Controller
 *
 * Retrieves all tasks for a given case.
 *
 * Accessible to:
 * - The advocate who owns the case
 * - Junior advocates assigned to the case
 */
export const getTasksByCase = async (req, res, next) => {
    try {
        const { caseId } = req.params;

        // Verify that the case exists
        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        const userId = req.user._id.toString();

        // Check if requester is the owning advocate
        const isAdvocate =
            existingCase.advocate.toString() === userId;

        // Check if requester is an assigned junior advocate
        const isJunior =
            existingCase.assignedJuniors.some(
                (j) => j.toString() === userId
            );

        // Enforce access control
        if (!isAdvocate && !isJunior) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        // Fetch tasks linked to the case
        const tasks = await Task.find({ case: caseId })
            .populate("assignedTo", "name email")
            .sort({ createdAt: -1 });

        // Respond with task list
        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        // Forward unexpected errors
        next(error);
    }
};

/**
 * Update Task Status Controller
 *
 * Allows an assigned junior advocate to update
 * the progress status of a task.
 */
export const updateTaskStatus = async (req, res, next) => {
    try {
        // Extract task identifier and new status
        const { taskId } = req.params;
        const { status } = req.body;

        // Validate task status value
        if (!["pending", "in_progress", "completed"].includes(status)) {
            const err = new Error("Invalid task status");
            err.statusCode = 400;
            return next(err);
        }

        // Fetch task record
        const task = await Task.findById(taskId);
        if (!task) {
            const err = new Error("Task not found");
            err.statusCode = 404;
            return next(err);
        }

        // Ensure only the assigned junior advocate can update the task
        if (task.assignedTo.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        // Update task status
        task.status = status;

        // Record completion timestamp if task is completed
        if (status === "completed") {
            task.completedAt = new Date();
        }

        // Fetch associated case to validate case state
        const existingCase = await Case.findById(task.case);

        // Prevent task updates once the case is completed
        if (existingCase.status === "completed") {
            const err = new Error(
                "Case is completed. Tasks cannot be modified."
            );
            err.statusCode = 403;
            return next(err);
        }

        // Persist task changes
        await task.save();

        // Log task completion event for audit trail
        await logAuditEvent({
            action: "TASK_COMPLETED",
            entityType: "Task",
            entityId: task._id,
            performedBy: req.user._id,
            message: `Task "${task.title}" completed`,
            metadata: {
                role: req.user.role,
                email: req.user.email,
                reviewedAt: new Date(),
            },
        });

        // Respond with updated task details
        res.status(200).json({
            success: true,
            message: "Task status updated",
            data: task
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};
