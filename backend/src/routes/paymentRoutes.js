import express from "express";
import {
    createManualPayment,
    createRazorpayOrder,
    verifyRazorpayPayment,
    getPayments,
    updatePaymentStatus
} from "../controller/paymentController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const paymentRouter = express.Router();

/**
 * Payment routes
 *
 * Handles manual payments, Razorpay integration,
 * payment retrieval, and status updates with role-based access control.
 */

/* ---------- MANUAL / OFFLINE PAYMENTS ---------- */

/**
 * POST /manual
 *
 * Record a manual or offline payment.
 * Accessible only to advocates.
 */
paymentRouter.post(
    "/manual",
    protect,
    requireRole("advocate"),
    createManualPayment
);

/* ---------- RAZORPAY PAYMENTS ---------- */

/**
 * POST /create-order
 *
 * Create a Razorpay order to initiate online payment.
 * Accessible only to advocates.
 */
paymentRouter.post(
    "/create-order",
    protect,
    requireRole("advocate"),
    createRazorpayOrder
);

/**
 * POST /verify
 *
 * Verify Razorpay payment signature and store payment record.
 * Accessible only to advocates.
 */
paymentRouter.post(
    "/verify",
    protect,
    requireRole("advocate"),
    verifyRazorpayPayment
);

/* ---------- COMMON ---------- */

/**
 * GET /
 *
 * Retrieve payments based on user role:
 * - Advocates: payments they received
 * - Clients: payments they made
 * - Junior advocates: payments for assigned cases
 * - Admins: full audit access
 */
paymentRouter.get(
    "/",
    protect,
    requireRole("advocate", "client", "admin", "junior_advocate"),
    getPayments
);

/**
 * PATCH /:paymentId/status
 *
 * Update the status of a payment.
 * Accessible only to the advocate who received the payment.
 */
paymentRouter.patch(
    "/:paymentId/status",
    protect,
    requireRole("advocate"),
    updatePaymentStatus
);

// Export payment router for mounting under /api/payments (or similar)
export default paymentRouter;
