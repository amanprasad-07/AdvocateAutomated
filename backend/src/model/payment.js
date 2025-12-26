import mongoose from "mongoose";

/**
 * Payment schema representing financial transactions
 * related to legal cases and services.
 * Supports multiple payment methods, status tracking,
 * and audit-friendly transaction records.
 */
const paymentSchema = new mongoose.Schema(
    {
        // Monetary amount involved in the transaction
        amount: {
            type: Number,
            required: true,
            min: 0 // Prevents negative payment values
        },

        // Currency code for the payment
        currency: {
            type: String,
            default: "INR"
        },

        // Description of what the payment is for
        paymentFor: {
            type: String,
            required: true,
            trim: true
        },

        /**
         * Relationship mappings
         */

        // Case associated with this payment
        case: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Case",
            required: true
        },

        // Client who made the payment
        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Advocate or user who received the payment
        receivedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        /**
         * Payment processing details
         */

        // Method used to complete the payment
        paymentMethod: {
            type: String,
            enum: ["upi", "card", "cash", "bank_transfer", "razorpay", "other"],
            required: true
        },

        // Current status of the payment transaction
        status: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending"
        },

        // Gateway or internal transaction reference ID
        transactionId: {
            type: String
        },

        // Timestamp recorded when payment is successfully completed
        paidAt: {
            type: Date
        }
    },
    {
        // Automatically manages createdAt and updatedAt fields
        timestamps: true
    }
);

// Export Payment model for use in billing and transaction workflows
export default mongoose.model("Payment", paymentSchema);
