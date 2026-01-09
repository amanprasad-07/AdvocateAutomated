import Task from "../model/task.js";
import Case from "../model/case.js";
import { logAuditEvent } from "../utils/auditLogger.js";

/**
 * Assign task to a junior advocate
 *
 * Accessible to Advocate role only
 * Creates a task linked to a case and assigns it to a junior advocate
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

        // Validate required fields
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

        // Ensure only the advocate who owns the case can assign tasks
        if (existingCase.advocate.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        if (existingCase.status === "closed") {
            const err = new Error(
                "Case is completed. No further changes are allowed."
            );
            err.statusCode = 403;
            return next(err);
        }

        // Create task record
        const task = await Task.create({
            title,
            description,
            case: caseId,
            assignedTo,
            assignedBy: req.user._id,
            priority,
            dueDate
        });

        await Case.findByIdAndUpdate(
            caseId,
            {
                $addToSet: { assignedJuniors: assignedTo }, // prevents duplicates
            },
            { new: true }
        );

        // Send confirmation response
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
 * Get tasks for a specific case
 *
 * Accessible to:
 * - Advocate who owns the case
 * - Junior advocates assigned to the case
 */
export const getTasksByCase = async (req, res, next) => {
    try {
        const { caseId } = req.params;

        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        const userId = req.user._id.toString();

        const isAdvocate =
            existingCase.advocate.toString() === userId;

        const isJunior =
            existingCase.assignedJuniors.some(
                (j) => j.toString() === userId
            );

        if (!isAdvocate && !isJunior) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        const tasks = await Task.find({ case: caseId })
            .populate("assignedTo", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });
    } catch (error) {
        next(error);
    }
};



/**
 * Update task status
 *
 * Accessible to Junior Advocate role only
 * Allows assigned junior advocate to update task progress
 */
export const updateTaskStatus = async (req, res, next) => {
    try {
        // Extract task ID and new status
        const { taskId } = req.params;
        const { status } = req.body;

        const existingCase = await Case.findById(task.case);

        if (existingCase.status === "completed") {
            const err = new Error(
                "Case is completed. Tasks cannot be modified."
            );
            err.statusCode = 403;
            return next(err);
        }

        // Validate task status value
        if (!["pending", "in_progress", "completed"].includes(status)) {
            const err = new Error("Invalid task status");
            err.statusCode = 400;
            return next(err);
        }

        // Fetch task by ID
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

        // Update task status and completion timestamp if applicable
        task.status = status;

        if (status === "completed") {
            task.completedAt = new Date();
        }

        // Persist changes
        await task.save();


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



        // Send confirmation response
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

