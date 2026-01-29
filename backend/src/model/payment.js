import mongoose from "mongoose";

/**
 * Payment / Bill Schema
 *
 * - Acts as a bill before payment
 * - Acts as the base record for invoice after payment
 */
const paymentSchema = new mongoose.Schema(
  {
    /* ---------- Identity ---------- */
    billNumber: {
      type: String,
      required: true,
      unique: true,
    },

    documentType: {
      type: String,
      enum: ["bill", "invoice"],
      default: "bill",
    },

    /* ---------- Line Items ---------- */
    lineItems: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },

        description: {
          type: String,
          trim: true,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },

        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },

        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    /* ---------- Amount Breakdown ---------- */
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    tax: {
      percentage: {
        type: Number,
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      label: {
        type: String,
        default: "GST",
      },
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    /* ---------- Relationships ---------- */
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ---------- Payment State ---------- */
    paymentMethod: {
      type: String,
      enum: ["razorpay", "upi", "card", "cash", "bank_transfer"],
      default: "razorpay",
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    transactionId: String,
    paidAt: Date,

    /* ---------- Invoice (Generated After Payment) ---------- */
    invoice: {
      invoiceNumber: {
        type: String,
        unique: true,
        sparse: true,
      },

      issuedAt: Date,

      invoiceUrl: {
        type: String,
      },

      cloudinaryPublicId: {
  type: String,
},


      version: {
        type: Number,
        default: 1,
      },

      hash: {
        type: String,
      },

      sellerSnapshot: {
        name: String,
        email: String,
        gstNumber: String,
        address: String,
      },

      buyerSnapshot: {
        name: String,
        email: String,
        address: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Payment", paymentSchema);
