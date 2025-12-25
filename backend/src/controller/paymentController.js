import Payment from "../model/payment.js";
import Case from "../model/case.js";

/**
 * Create / record a payment
 * Advocate only
 */
export const createPayment = async (req, res, next) => {
    try {
        const {
            amount,
            currency = "INR",
            paymentFor,
            caseId,
            paymentMethod,
            transactionId
        } = req.body;

        if (!amount || !paymentFor || !caseId || !paymentMethod) {
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

        // Only the assigned advocate can record payments
        if (existingCase.advocate.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

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

        res.status(201).json({
            success: true,
            message: "Payment recorded successfully",
            data: payment
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get payments (role-based)
 */
export const getPayments = async (req, res, next) => {
    try {
        let filter = {};

        // Client: only their payments
        if (req.user.role === "client") {
            filter.client = req.user._id;
        }

        // Advocate: payments for cases they handle
        if (req.user.role === "advocate") {
            filter.receivedBy = req.user._id;
        }

        // Junior Advocate: payments for cases they are assigned to
        if (req.user.role === "junior_advocate") {
            const assignedCases = await Case.find({
                assignedJuniors: req.user._id
            }).select("_id");

            const caseIds = assignedCases.map(c => c._id);

            filter.case = { $in: caseIds };
        }

        // Admin: no filter (see all)

        const payments = await Payment.find(filter)
            .populate("case", "caseNumber title")
            .populate("client", "name email")
            .populate("receivedBy", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: payments.length,
            data: payments
        });

    } catch (error) {
        next(error);
    }
};


/**
 * Update payment status
 * Advocate only
 */
export const updatePaymentStatus = async (req, res, next) => {
    try {
        const { paymentId } = req.params;
        const { status } = req.body;

        if (!["pending", "completed", "failed"].includes(status)) {
            const err = new Error("Invalid payment status");
            err.statusCode = 400;
            return next(err);
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            const err = new Error("Payment not found");
            err.statusCode = 404;
            return next(err);
        }

        // Only advocate who received payment can update
        if (payment.receivedBy.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        payment.status = status;
        if (status === "completed") {
            payment.paidAt = new Date();
        }

        await payment.save();

        res.status(200).json({
            success: true,
            message: "Payment status updated",
            data: payment
        });

    } catch (error) {
        next(error);
    }
};
