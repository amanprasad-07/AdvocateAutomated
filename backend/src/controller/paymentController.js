import Payment from "../model/payment.js";
import Case from "../model/case.js";
import razorpay from "../services/razorpay.js";
import crypto from "crypto";
import { logAuditEvent } from "../utils/auditLogger.js";

/**
 * Create / record a manual payment
 *
 * Accessible to Advocate role only
 * Used for offline or already-settled payments
 */
export const createManualPayment = async (req, res, next) => {
    try {
        // Extract payment details from request body
        const {
            amount,
            currency = "INR",
            paymentFor,
            caseId,
            paymentMethod,
            transactionId
        } = req.body;

        // Validate required fields
        if (!amount || !paymentFor || !caseId || !paymentMethod) {
            const err = new Error("Missing required fields");
            err.statusCode = 400;
            return next(err);
        }

        // Verify that the referenced case exists
        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        // Only the advocate assigned to the case can record payments
        if (existingCase.advocate.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        // Create completed payment record
        const payment = await Payment.create({
            amount,
            currency,
            paymentFor,
            case: caseId,
            client: existingCase.client,
            receivedBy: req.user._id,
            paymentMethod,
            transactionId,
            status: "paid",
            paidAt: new Date()
        });

        // Send confirmation response
        res.status(201).json({
            success: true,
            message: "Payment recorded successfully",
            data: payment
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};

/**
 * Get payments (role-based access)
 *
 * - Clients: view only their own payments
 * - Advocates: view payments they received
 * - Junior advocates: view payments for assigned cases
 * - Admins: unrestricted audit access
 */
export const getPayments = async (req, res, next) => {
    try {
        let filter = {};

        // Client access: only payments made by the client
        if (req.user.role === "client") {
            filter.client = req.user._id;
        }

        // Advocate access: payments received by the advocate
        if (req.user.role === "advocate") {
            filter.receivedBy = req.user._id;
        }

        // Junior advocate access: payments related to assigned cases
        if (req.user.role === "junior_advocate") {
            const assignedCases = await Case.find({
                assignedJuniors: req.user._id
            }).select("_id");

            const caseIds = assignedCases.map(c => c._id);
            filter.case = { $in: caseIds };
        }

        // Admin access: no filter applied

        // Fetch payments with populated relational data
        const payments = await Payment.find(filter)
            .populate("case", "caseNumber title")
            .populate("client", "name email")
            .populate("receivedBy", "name email")
            .sort({ createdAt: -1 });

        // Send response with payment list
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
 * Update payment status
 *
 * Accessible to the advocate who received the payment
 */
export const updatePaymentStatus = async (req, res, next) => {
    try {
        // Extract payment ID and new status
        const { paymentId } = req.params;
        const { status } = req.body;

        // Validate payment status value
        if (!["pending", "paid", "failed"].includes(status)) {
            const err = new Error("Invalid payment status");
            err.statusCode = 400;
            return next(err);
        }

        // Fetch payment by ID
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            const err = new Error("Payment not found");
            err.statusCode = 404;
            return next(err);
        }

        // Only the advocate who received the payment can update it
        if (payment.receivedBy.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        // Update payment status and completion timestamp if applicable
        payment.status = status;
        if (status === "paid") {
            payment.paidAt = new Date();
        }

        // Persist changes
        await payment.save();

        // Send confirmation response
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
 * Razorpay integration (Test Mode)
 *
 * Creates a Razorpay order to initiate online payment
 */
export const createRazorpayOrder = async (req, res, next) => {
    try {
        const { amount } = req.body;

        // Validate payment amount
        if (!amount) {
            const err = new Error("Amount is required");
            err.statusCode = 400;
            return next(err);
        }

        // Create Razorpay order (amount converted to paise)
        const order = await razorpay.orders.create({
            amount: amount * 100, // INR → paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        });

        // Send order details to client
        res.status(200).json({
            success: true,
            order,
        });

    } catch (error) {
        // Forward Razorpay or server errors
        next(error);
    }
};

/**
 * Verify Razorpay payment
 *
 * Validates payment signature and records completed payment
 */
export const verifyRazorpayPayment = async (req, res, next) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            paymentId
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentId) {
            const err = new Error("Missing Razorpay verification fields");
            err.statusCode = 400;
            return next(err);
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            const err = new Error("Payment verification failed");
            err.statusCode = 400;
            return next(err);
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            const err = new Error("Payment not found");
            err.statusCode = 404;
            return next(err);
        }

        payment.status = "paid";
        payment.transactionId = razorpay_payment_id;
        payment.paidAt = new Date();

        await payment.save();

        try {
            await logAuditEvent({
                action: "PAYMENT_COMPLETED",
                entityType: "Payment",
                entityId: payment._id,
                performedBy: req.user._id,
                message: `Payment of ₹${amount} completed`,
                metadata: {
                    role: req.user.role,
                    email: req.user.email,
                    reviewedAt: new Date(),
                },
            });
        } catch (auditError) {
            console.warn("Audit logging failed:", auditError.message);
        }


        res.status(200).json({
            success: true,
            message: "Payment verified and completed",
            data: payment
        });

    } catch (error) {
        next(error);
    }
};


/**
 * Create bill (request payment)
 *
 * Advocate creates a pending payment request for a client
 */
export const createBill = async (req, res, next) => {
    try {
        const { caseId, amount, paymentFor } = req.body;

        if (!caseId || !amount || !paymentFor) {
            const err = new Error("Missing required fields");
            err.statusCode = 400;
            return next(err);
        }

        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        if (existingCase.status === "closed") {
            const err = new Error(
                "Case is completed. No further changes are allowed."
            );
            err.statusCode = 403;
            return next(err);
        }

        // Only the advocate of the case can bill
        if (existingCase.advocate.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        const payment = await Payment.create({
            amount,
            currency: "INR",
            paymentFor,
            case: caseId,
            client: existingCase.client,
            receivedBy: req.user._id,
            paymentMethod: "razorpay", // default
            status: "pending"
        });

        res.status(201).json({
            success: true,
            message: "Payment request created",
            data: payment
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Delete payment (only if pending)
 *
 * Accessible only to advocate who created it
 */
export const deletePayment = async (req, res, next) => {
    try {
        const { paymentId } = req.params;

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            const err = new Error("Payment not found");
            err.statusCode = 404;
            return next(err);
        }

        if (payment.receivedBy.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        if (payment.status !== "pending") {
            const err = new Error("Only pending bills can be deleted");
            err.statusCode = 400;
            return next(err);
        }

        await payment.deleteOne();

        res.status(200).json({
            success: true,
            message: "Bill deleted successfully"
        });

    } catch (error) {
        next(error);
    }
};

