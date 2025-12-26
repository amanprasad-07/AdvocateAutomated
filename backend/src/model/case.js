import mongoose from "mongoose";

/**
 * Case schema representing a legal case within the system.
 * Defines case metadata, role-based relationships,
 * lifecycle status, and historical notes.
 */
const caseSchema = new mongoose.Schema(
    {
        // Unique, human-readable case identifier
        caseNumber: {
            type: String,
            required: true,
            unique: true
        },

        // Short descriptive title of the case
        title: {
            type: String,
            required: true,
            trim: true
        },

        // Detailed case description or summary
        description: {
            type: String,
            required: true,
            trim: true
        },

        // Classification of case based on legal domain
        caseType: {
            type: String,
            enum: ["civil", "criminal", "corporate", "family", "other"],
            required: true
        },

        // Current lifecycle status of the case
        status: {
            type: String,
            enum: ["open", "in_progress", "closed"],
            default: "open"
        },

        /**
         * Relationship mappings
         */

        // Client associated with the case
        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Primary advocate assigned to the case
        advocate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Junior advocates assisting on the case
        assignedJuniors: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        // User who created or registered the case in the system
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        /**
         * Case activity log / history
         */

        // Chronological list of notes or updates related to the case
        caseHistory: [
            {
                // Case note or update content
                note: {
                    type: String,
                    required: true
                },

                // User who added the note
                addedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true
                },

                // Timestamp for when the note was created
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        // Timestamp marking when the case was officially opened
        openedAt: {
            type: Date,
            default: Date.now
        },

        // Timestamp marking when the case was closed
        closedAt: {
            type: Date
        }
    },
    {
        // Automatically maintains createdAt and updatedAt fields
        timestamps: true
    }
);

// Export Case model for use in case management workflows
export default mongoose.model("Case", caseSchema);
