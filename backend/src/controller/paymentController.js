import Payment from "../model/payment.js";
import Case from "../model/case.js";
import razorpay from "../services/razorpay.js";
import crypto from "crypto";
import { logAuditEvent } from "../utils/auditLogger.js";


/**
 * Get Payments Controller
 *
 * Returns payment records based on role-based access rules:
 * - Client: own payments only
 * - Advocate: payments received
 * - Junior advocate: payments for assigned cases
 * - Admin: unrestricted access
 */
export const getPayments = async (req, res, next) => {
    try {
        let filter = {};

        // Client access: payments made by the client
        if (req.user.role === "client") {
            filter.client = req.user._id;
        }

        // Advocate access: payments received by the advocate
        if (req.user.role === "advocate") {
            filter.receivedBy = req.user._id;
        }

        // Admin access: no additional filtering applied

        // Fetch payments with related case and user details
        const payments = await Payment.find(filter)
            .populate("case", "caseNumber title")
            .populate("client", "name email")
            .populate("receivedBy", "name email")
            .sort({ createdAt: -1 });

        // Respond with payment list
        res.status(200).json({
            success: true,
            count: payments.length,
            data: payments
        });

    } catch (error) {
        // Forward errors to centralized error handler
        next(error);
    }
};

/**
 * Update Payment Status Controller
 *
 * Allows the receiving advocate to update
 * the status of a payment.
 */
export const updatePaymentStatus = async (req, res, next) => {
    try {
        // Extract payment identifier and desired status
        const { paymentId } = req.params;
        const { status } = req.body;

        // Validate status value
        if (!["pending", "paid", "failed"].includes(status)) {
            const err = new Error("Invalid payment status");
            err.statusCode = 400;
            return next(err);
        }

        // Fetch payment record
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            const err = new Error("Payment not found");
            err.statusCode = 404;
            return next(err);
        }

        // Restrict updates to the receiving advocate
        if (payment.receivedBy.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        // Update payment state
        payment.status = status;
        if (status === "paid") {
            payment.paidAt = new Date();
        }

        // Persist changes
        await payment.save();

        // Respond with updated payment
        res.status(200).json({
            success: true,
            message: "Payment status updated",
            data: payment
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};

/**
 * Create Razorpay Order Controller (Test Mode)
 *
 * Creates a Razorpay order to initiate an online payment.
 */
export const createRazorpayOrder = async (req, res, next) => {
    try {
        const { paymentId } = req.body;

        if (!paymentId) {
            const err = new Error("Payment ID is required");
            err.statusCode = 400;
            return next(err);
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            const err = new Error("Payment not found");
            err.statusCode = 404;
            return next(err);
        }

        if (payment.status !== "pending") {
            const err = new Error("Payment is not pending");
            err.statusCode = 400;
            return next(err);
        }

        const order = await razorpay.orders.create({
            amount: payment.total * 100, // authoritative
            currency: "INR",
            receipt: payment.billNumber,
        });

        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        next(error);
    }
};


/**
 * Verify Razorpay Payment Controller
 *
 * Verifies Razorpay payment signature
 * and marks the payment as completed.
 */
export const verifyRazorpayPayment = async (req, res, next) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            paymentId
        } = req.body;

        // Validate required Razorpay verification fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentId) {
            const err = new Error("Missing Razorpay verification fields");
            err.statusCode = 400;
            return next(err);
        }

        // Generate expected signature for verification
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        // Reject invalid payment signatures
        if (expectedSignature !== razorpay_signature) {
            const err = new Error("Payment verification failed");
            err.statusCode = 400;
            return next(err);
        }

        // Fetch corresponding payment record
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            const err = new Error("Payment not found");
            err.statusCode = 404;
            return next(err);
        }

        // Mark payment as completed
        payment.status = "paid";
        payment.transactionId = razorpay_payment_id;
        payment.paidAt = new Date();

        await payment.save();

        // Attempt to log audit event without blocking the response
        try {
            await logAuditEvent({
                action: "PAYMENT_COMPLETED",
                entityType: "Payment",
                entityId: payment._id,
                performedBy: req.user._id,
                message: `Payment of ₹${payment.total} completed`,
                metadata: {
                    role: req.user.role,
                    email: req.user.email,
                    reviewedAt: new Date(),
                },
            });
        } catch (auditError) {
            console.warn("Audit logging failed:", auditError.message);
        }

        // Respond with verification success
        res.status(200).json({
            success: true,
            message: "Payment verified and completed",
            data: payment
        });

    } catch (error) {
        // Forward unexpected errors
        next(error);
    }
};

/**
 * Create Bill Controller
 *
 * Allows an advocate to generate a pending
 * payment request for a client.
 */
export const createBill = async (req, res, next) => {
    try {
        const { caseId, lineItems } = req.body;

        if (!caseId || !Array.isArray(lineItems) || lineItems.length === 0) {
            const err = new Error("Case and at least one bill item are required");
            err.statusCode = 400;
            return next(err);
        }

        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        if (existingCase.advocate.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        /* ---------- GST CONFIG (INDIA) ---------- */
        const GST_PERCENTAGE = 18;

        /* ---------- Compute Line Items ---------- */
        const computedItems = lineItems.map((item) => {
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice);

            if (!item.title || quantity <= 0 || unitPrice < 0) {
                throw new Error("Invalid line item data");
            }

            return {
                title: item.title,
                description: item.description,
                quantity,
                unitPrice,
                amount: quantity * unitPrice,
            };
        });

        const subtotal = computedItems.reduce(
            (sum, item) => sum + item.amount,
            0
        );

        const taxAmount = Math.round((subtotal * GST_PERCENTAGE) / 100);
        const total = subtotal + taxAmount;

        /* ---------- Generate Bill Number ---------- */
        const billNumber = `BILL-${new Date().getFullYear()}-${Date.now()}`;

        /* ---------- Create Bill ---------- */
        const payment = await Payment.create({
            billNumber,
            documentType: "bill",

            case: caseId,
            client: existingCase.client,
            receivedBy: req.user._id,

            lineItems: computedItems,
            subtotal,

            tax: {
                percentage: GST_PERCENTAGE,
                amount: taxAmount,
                label: `GST @ ${GST_PERCENTAGE}%`,
            },

            total,
            currency: "INR",

            paymentMethod: "razorpay",
            status: "pending",
        });

        res.status(201).json({
            success: true,
            message: "Bill created successfully",
            data: payment,
        });
    } catch (error) {
        next(error);
    }
};




/**
 * Delete Payment Controller
 *
 * Allows deletion of a pending payment request.
 * Accessible only to the advocate who created it.
 */
export const deletePayment = async (req, res, next) => {
    try {
        const { paymentId } = req.params;

        // Fetch payment record
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            const err = new Error("Payment not found");
            err.statusCode = 404;
            return next(err);
        }

        // Restrict deletion to the receiving advocate
        if (payment.receivedBy.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        // Only pending payments can be deleted
        if (payment.status !== "pending") {
            const err = new Error("Only pending bills can be deleted");
            err.statusCode = 400;
            return next(err);
        }

        // Permanently remove the payment record
        await payment.deleteOne();

        // Respond with deletion confirmation
        res.status(200).json({
            success: true,
            message: "Bill deleted successfully"
        });

    } catch (error) {
        // Forward unexpected errors
        next(error);
    }
};
