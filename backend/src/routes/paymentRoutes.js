import express from "express";
import {
    createRazorpayOrder,
    verifyRazorpayPayment,
    getPayments,
    updatePaymentStatus,
    createBill,
    deletePayment
} from "../controller/paymentController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const paymentRouter = express.Router();

/**
 * Payment Routes
 *
 * Defines endpoints for handling payment creation,
 * verification, retrieval, and management with
 * strict role-based access control.
 */

/**
 * POST /create-order
 *
 * Creates a Razorpay order to initiate an online payment.
 * Accessible to advocates and clients.
 */
paymentRouter.post(
    "/create-order",
    protect,
    requireRole("advocate", "client"),
    createRazorpayOrder
);

/**
 * POST /verify
 *
 * Verifies Razorpay payment signature and finalizes
 * the corresponding payment record.
 * Accessible to advocates and clients.
 */
paymentRouter.post(
    "/verify",
    protect,
    requireRole("advocate", "client"),
    verifyRazorpayPayment
);

/* ---------- COMMON ---------- */

/**
 * GET /
 *
 * Retrieves payment records based on user role:
 * - Advocates: payments they received
 * - Clients: payments they made
 * - Admins: full audit access
 */
paymentRouter.get(
    "/",
    protect,
    requireRole("advocate", "client", "admin"),
    getPayments
);

/**
 * PATCH /:paymentId/status
 *
 * Updates the status of an existing payment.
 * Accessible only to the advocate who received the payment.
 */
paymentRouter.patch(
    "/:paymentId/status",
    protect,
    requireRole("advocate"),
    updatePaymentStatus
);

/**
 * POST /bill
 *
 * Creates a pending payment request (bill) for a client.
 * Accessible only to advocates.
 */
paymentRouter.post(
    "/bill",
    protect,
    requireRole("advocate"),
    createBill
);

/**
 * DELETE /:paymentId
 *
 * Deletes a pending payment request.
 * Accessible only to the advocate who created the bill.
 */
paymentRouter.delete(
    "/:paymentId",
    protect,
    requireRole("advocate"),
    deletePayment
);

// Export payment router for mounting under /api/payments (or similar)
export default paymentRouter;
