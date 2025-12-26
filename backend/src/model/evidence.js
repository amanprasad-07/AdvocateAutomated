import mongoose from "mongoose";

/**
 * Evidence schema representing files or materials
 * submitted in relation to a legal case or task.
 * Supports auditability, confidentiality,
 * and structured file metadata.
 */
const evidenceSchema = new mongoose.Schema(
    {
        // Human-readable title for the evidence
        title: {
            type: String,
            required: true,
            trim: true
        },

        // Optional descriptive context for the evidence
        description: {
            type: String,
            trim: true
        },

        /**
         * File metadata
         */

        // Public or protected URL pointing to the stored file
        // Typically references cloud storage (e.g., S3, Cloudinary)
        fileUrl: {
            type: String,
            required: true
        },

        // Logical categorization of the file
        fileType: {
            type: String,
            enum: ["document", "image", "video", "audio", "other"],
            required: true
        },

        // MIME type used for validation and content handling
        mimeType: {
            type: String,
            required: true
        },

        // File size in bytes (used for validation and auditing)
        fileSize: {
            type: Number,
            required: true
        },

        /**
         * Relationship mappings
         */

        // Case to which this evidence belongs
        case: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Case",
            required: true
        },

        // Optional task associated with this evidence
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task"
        },

        // User who uploaded the evidence
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        /**
         * Visibility and audit controls
         */

        // Indicates whether the evidence is restricted
        isConfidential: {
            type: Boolean,
            default: false
        },

        // Timestamp marking when the evidence was uploaded
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        // Automatically manages createdAt and updatedAt fields
        timestamps: true
    }
);

// Export Evidence model for use in document and file management workflows
export default mongoose.model("Evidence", evidenceSchema);
