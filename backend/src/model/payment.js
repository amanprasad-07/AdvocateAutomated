import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        amount: {
            type: Number,
            required: true,
            min: 0
        },

        currency: {
            type: String,
            default: "INR"
        },

        paymentFor: {
            type: String,
            required: true,
            trim: true
        },

        // Relationships
        case: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Case",
            required: true
        },

        client: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        receivedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Payment details
        paymentMethod: {
            type: String,
            enum: ["upi", "card", "cash", "bank_transfer", "other"],
            required: true
        },

        status: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending"
        },

        transactionId: {
            type: String
        },

        paidAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.model("Payment", paymentSchema);
