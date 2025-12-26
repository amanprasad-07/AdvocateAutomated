import mongoose from "mongoose";

/**
 * Evidence Schema
 *
 * Represents files uploaded in relation to a legal case.
 * Stores file system metadata along with relational references
 * for auditability and access control.
 */
const evidenceSchema = new mongoose.Schema(
    {
        // Reference to the associated case
        case: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Case",
            required: true
        },

        // User who uploaded the evidence
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Human-readable title for the evidence
        title: {
            type: String,
            required: true,
            trim: true
        },

        // Original filename of the uploaded file
        fileName: {
            type: String,
            required: true
        },

        // Server file system path where the file is stored
        filePath: {
            type: String,
            required: true
        },

        // File size in bytes (used for validation and auditing)
        fileSize: {
            type: Number,
            required: true
        },

        // MIME type of the uploaded file
        mimeType: {
            type: String,
            required: true
        },

        // Logical file category derived from MIME type
        fileType: {
            type: String,
            enum: ["pdf", "image"],
            required: true
        },

        // Optional descriptive context for the evidence
        description: {
            type: String,
            trim: true
        }
    },
    {
        // Automatically adds createdAt and updatedAt timestamps
        timestamps: true
    }
);

// Export Evidence model for use in upload and retrieval workflows
export default mongoose.model("Evidence", evidenceSchema);
