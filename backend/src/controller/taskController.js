import Task from "../model/task.js";
import Case from "../model/case.js";

/**
 * Assign task to a junior advocate
 * Advocate only
 */
export const createTask = async (req, res, next) => {
    try {
        const {
            title,
            description,
            caseId,
            assignedTo,
            priority,
            dueDate
        } = req.body;

        if (!title || !description || !caseId || !assignedTo || !dueDate) {
            const err = new Error("Missing required fields");
            err.statusCode = 400;
            return next(err);
        }

        // Verify case exists
        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        // Ensure advocate owns the case
        if (existingCase.advocate.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        const task = await Task.create({
            title,
            description,
            case: caseId,
            assignedTo,
            assignedBy: req.user._id,
            priority,
            dueDate
        });

        res.status(201).json({
            success: true,
            message: "Task assigned successfully",
            data: task
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get tasks (role-based)
 */
export const getTasks = async (req, res, next) => {
    try {
        let filter = {};

        if (req.user.role === "junior_advocate") {
            filter.assignedTo = req.user._id;
        }

        if (req.user.role === "advocate") {
            filter.assignedBy = req.user._id;
        }

        const tasks = await Task.find(filter)
            .populate("case", "title caseNumber")
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
 * Junior advocate only
 */
export const updateTaskStatus = async (req, res, next) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;

        if (!["pending", "in_progress", "completed"].includes(status)) {
            const err = new Error("Invalid task status");
            err.statusCode = 400;
            return next(err);
        }

        const task = await Task.findById(taskId);
        if (!task) {
            const err = new Error("Task not found");
            err.statusCode = 404;
            return next(err);
        }

        // Only assigned junior can update
        if (task.assignedTo.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        task.status = status;

        if (status === "completed") {
            task.completedAt = new Date();
        }

        await task.save();

        res.status(200).json({
            success: true,
            message: "Task status updated",
            data: task
        });

    } catch (error) {
        next(error);
    }
};
