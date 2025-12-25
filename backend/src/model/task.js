import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        // Relationship to Case
        case: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Case",
            required: true
        },

        // Assignment
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        status: {
            type: String,
            enum: ["pending", "in_progress", "completed"],
            default: "pending"
        },

        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium"
        },

        dueDate: {
            type: Date,
            required: true
        },

        completedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Task", taskSchema);
