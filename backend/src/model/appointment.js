import mongoose from "mongoose";

/**
 * Appointment Schema
 * ------------------
 * Defines the structure for appointment records between
 * clients and advocates.
 *
 * Appointments are standalone entities and may optionally
 * result in a case being created later in the workflow.
 *
 * Typical lifecycle:
 * Client → requests appointment
 * Advocate → approves / rejects
 * Advocate → completes (optionally creates a case)
 */
const appointmentSchema = new mongoose.Schema(
    {
        /**
         * Reference to the client who requested the appointment.
         */
        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        /**
         * Reference to the advocate with whom the appointment is scheduled.
         */
        advocate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        /**
         * Calendar date on which the appointment is scheduled.
         */
        date: {
            type: Date,
            required: true
        },

        /**
         * Time range for the appointment.
         *
         * Stored as a string to keep scheduling flexible
         * and avoid strict time calculations at the schema level.
         * Example: "10:00 - 10:30"
         */
        timeSlot: {
            type: String,
            required: true
        },

        /**
         * Brief description explaining the purpose of the appointment.
         */
        purpose: {
            type: String,
            trim: true,
            maxlength: 300
        },

        /**
         * Current status of the appointment.
         *
         * requested  → initial state after client submission
         * approved   → accepted by advocate
         * rejected   → declined by advocate
         * completed  → appointment concluded
         */
        status: {
            type: String,
            enum: ["requested", "approved", "rejected", "completed"],
            default: "requested"
        },

        /**
         * Optional notes added by the advocate.
         * Can include remarks, observations, or next steps.
         */
        notes: {
            type: String,
            trim: true
        },

        /**
         * Flag indicating whether this appointment
         * has resulted in a case being created.
         */
        caseCreated: {
            type: Boolean,
            default: false
        },

        /**
         * Reference to the case created from this appointment,
         * if applicable.
         */
        linkedCase: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Case"
        }

    },
    {
        /**
         * Automatically adds createdAt and updatedAt timestamps.
         */
        timestamps: true
    }
);

export default mongoose.model("Appointment", appointmentSchema);
