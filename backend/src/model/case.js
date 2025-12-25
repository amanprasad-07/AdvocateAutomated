import mongoose from "mongoose";

const caseSchema = new mongoose.Schema(
    {
        caseNumber: {
            type: String,
            required: true,
            unique: true
        },

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

        caseType: {
            type: String,
            enum: ["civil", "criminal", "corporate", "family", "other"],
            required: true
        },

        status: {
            type: String,
            enum: ["open", "in_progress", "closed"],
            default: "open"
        },

        // Relationships
        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        advocate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        assignedJuniors: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Case history / notes
        caseHistory: [
            {
                note: {
                    type: String,
                    required: true
                },
                addedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true
                },
                createdAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        openedAt: {
            type: Date,
            default: Date.now
        },

        closedAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Case", caseSchema);
