import mongoose from "mongoose";

/**
 * Task schema representing actionable items linked to a legal case.
 * Used to track assignments, priorities, deadlines,
 * and completion status across users.
 */
const taskSchema = new mongoose.Schema(
    {
        // Short, descriptive task title
        title: {
            type: String,
            required: true,
            trim: true
        },

        // Detailed explanation of the task
        description: {
            type: String,
            required: true,
            trim: true
        },

        /**
         * Relationship to Case
         */

        // Case to which this task belongs
        case: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Case",
            required: true
        },

        /**
         * Assignment metadata
         */

        // User responsible for completing the task
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // User who created or assigned the task
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Current progress status of the task
        status: {
            type: String,
            enum: ["pending", "in_progress", "completed"],
            default: "pending"
        },

        // Priority level used for task ordering and urgency
        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium"
        },

        // Deadline by which the task must be completed
        dueDate: {
            type: Date,
            required: true
        },

        // Timestamp recorded when the task is marked as completed
        completedAt: {
            type: Date
        }
    },
    {
        // Automatically adds createdAt and updatedAt timestamps
        timestamps: true
    }
);

// Export Task model for use in task assignment and tracking workflows
export default mongoose.model("Task", taskSchema);
