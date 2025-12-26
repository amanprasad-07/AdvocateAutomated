import mongoose from "mongoose";

/**
 * Appointment Schema
 * -------------------
 * Represents a scheduled interaction between a client and an advocate.
 * Appointments are independent of cases and can later lead to case creation.
 *
 * Flow:
 * Client → requests appointment
 * Advocate → approves / rejects / completes
 */
const appointmentSchema = new mongoose.Schema(
    {
        /**
         * Client who requested the appointment
         */
        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        /**
         * Advocate with whom the appointment is scheduled
         */
        advocate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        /**
         * Date of the appointment
         */
        date: {
            type: Date,
            required: true
        },

        /**
         * Time slot for the appointment
         * Stored as string for simplicity (e.g. "10:00 - 10:30")
         */
        timeSlot: {
            type: String,
            required: true
        },

        /**
         * Purpose or reason for the appointment
         */
        purpose: {
            type: String,
            trim: true,
            maxlength: 300
        },

        /**
         * Current appointment status
         * requested → approved → completed
         * requested → rejected
         */
        status: {
            type: String,
            enum: ["requested", "approved", "rejected", "completed"],
            default: "requested"
        },

        /**
         * Optional notes added by advocate (remarks, follow-ups, etc.)
         */
        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Appointment", appointmentSchema);
