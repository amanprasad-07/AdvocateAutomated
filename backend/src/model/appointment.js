import mongoose from "mongoose";

/**
 * Appointment Schema
 * ------------------
 * Defines the structure for appointment records between
 * clients and advocates.
 *
 * AI-assisted case analysis is MANDATORY
 * before an appointment can be booked.
 */
const appointmentSchema = new mongoose.Schema(
  {
    /**
     * Reference to the client who requested the appointment.
     */
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * Reference to the advocate with whom the appointment is scheduled.
     */
    advocate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * Calendar date on which the appointment is scheduled.
     */
    date: {
      type: Date,
      required: true,
    },

    /**
     * Time range for the appointment.
     * Example: "10:00 - 10:30"
     */
    timeSlot: {
      type: String,
      required: true,
    },

    /**
     * Brief description explaining the purpose of the appointment.
     */
    purpose: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    /**
     * -----------------------------
     * AI CASE ASSISTANT OUTPUT
     * -----------------------------
     * Mandatory structured data generated
     * before appointment booking.
     */
    aiAnalysis: {
      type: {
        /**
         * Raw inputs provided by the client
         * to the AI assistant.
         */
        input: {
          description: {
            type: String,
            required: true,
          },
          category: {
            type: String,
            required: true,
          },
          urgency: {
            type: String,
            required: true,
          },
          hasDocuments: {
            type: String,
            required: true,
          },
          location: {
            type: String,
            required: true,
          },
        },

        /**
         * AI-generated structured interpretation.
         */
        output: {
          caseType: {
            type: String,
            required: true,
          },
          urgency: {
            type: String,
            required: true,
          },
          evidenceReadiness: {
            type: String,
            required: true,
          },
          recommendedSpecialization: {
            type: String,
            required: true,
          },
          nextSteps: {
            type: [String],
            required: true,
          },
        },

        /**
         * AI metadata for traceability
         * and audit purposes.
         */
        meta: {
          provider: {
            type: String,
            required: true, // e.g. "openai", "google"
          },
          model: {
            type: String,
            required: true, // e.g. "gpt-5", "gemini-3"
          },
          generatedAt: {
            type: Date,
            default: Date.now,
          },
        },
      },
      required: true,
      immutable: true,
    },

    /**
     * Current status of the appointment.
     */
    status: {
      type: String,
      enum: ["requested", "approved", "rejected", "completed"],
      default: "requested",
    },

    /**
     * Optional notes added by the advocate.
     */
    notes: {
      type: String,
      trim: true,
    },

    /**
     * Flag indicating whether this appointment
     * has resulted in a case being created.
     */
    caseCreated: {
      type: Boolean,
      default: false,
    },

    /**
     * Reference to the case created from this appointment,
     * if applicable.
     */
    linkedCase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Appointment", appointmentSchema);
