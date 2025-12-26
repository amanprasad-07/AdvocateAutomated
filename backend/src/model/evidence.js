import mongoose from "mongoose";

/**
 * Evidence Schema
 * Represents files uploaded for a case
 */
const evidenceSchema = new mongoose.Schema(
    {
        case: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Case",
            required: true
        },

        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        fileName: {
            type: String,
            required: true
        },

        filePath: {
            type: String,
            required: true
        },

        fileSize: {
            type: Number,
            required: true
        },

        mimeType: {
            type: String,
            required: true
        },

        fileType: {
            type: String,
            enum: ["pdf", "image"],
            required: true
        },

        description: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Evidence", evidenceSchema);
