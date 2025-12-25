import mongoose from "mongoose";

const evidenceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        // File metadata
        fileUrl: {
            type: String,
            required: true
        },

        fileType: {
            type: String,
            enum: ["document", "image", "video", "audio", "other"],
            required: true
        },

        mimeType: {
            type: String,
            required: true
        },

        fileSize: {
            type: Number,
            required: true
        },

        // Relationships
        case: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Case",
            required: true
        },

        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task"
        },

        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Visibility & audit
        isConfidential: {
            type: Boolean,
            default: false
        },

        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Evidence", evidenceSchema);

