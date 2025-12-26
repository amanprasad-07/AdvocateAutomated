import Task from "../model/task.js";
import Case from "../model/case.js";

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
        if (!title || !description || !caseId || !assignedTo || !dueDate) {
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
 * Get tasks (role-based access)
 *
 * - Junior advocates: tasks assigned to them
 * - Advocates: tasks they have assigned
 */
export const getTasks = async (req, res, next) => {
    try {
        let filter = {};

        // Junior advocates see only their assigned tasks
        if (req.user.role === "junior_advocate") {
            filter.assignedTo = req.user._id;
        }

        // Advocates see tasks they have created/assigned
        if (req.user.role === "advocate") {
            filter.assignedBy = req.user._id;
        }

        // Fetch tasks with populated relational data
        const tasks = await Task.find(filter)
            .populate("case", "title caseNumber")
            .populate("assignedTo", "name email")
            .sort({ createdAt: -1 });

        // Send response with task list
        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks
        });

    } catch (error) {
        // Forward errors to centralized error handler
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
