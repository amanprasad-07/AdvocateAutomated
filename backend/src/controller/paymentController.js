import Payment from "../model/payment.js";
import Case from "../model/case.js";
import razorpay from "../services/razorpay.js";
import crypto from "crypto";

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
            status: "completed",
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
        if (!["pending", "completed", "failed"].includes(status)) {
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
        if (status === "completed") {
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
        // Extract Razorpay verification fields
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            caseId,
            amount
        } = req.body || {};

        // Validate required Razorpay fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            const err = new Error("Missing Razorpay verification fields");
            err.statusCode = 400;
            return next(err);
        }

        // Generate expected signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        // Verify signature integrity
        if (expectedSignature !== razorpay_signature) {
            const err = new Error("Payment verification failed");
            err.statusCode = 400;
            return next(err);
        }

        // Verify case existence
        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        // Only the assigned advocate can verify and record payment
        if (existingCase.advocate.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        // Validate payment amount
        if (!amount || amount <= 0) {
            const err = new Error("Invalid amount");
            err.statusCode = 400;
            return next(err);
        }

        // Record verified Razorpay payment
        const payment = await Payment.create({
            amount,
            currency: "INR",
            paymentFor: "Case payment",
            case: caseId,
            client: existingCase.client,
            receivedBy: req.user._id,
            paymentMethod: "razorpay",
            transactionId: razorpay_payment_id,
            status: "completed",
            paidAt: new Date(),
        });

        // Send confirmation response
        res.status(201).json({
            success: true,
            message: "Payment verified and saved",
            data: payment,
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};
