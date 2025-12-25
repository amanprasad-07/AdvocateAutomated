import express from "express";
import {
    createPayment,
    getPayments,
    updatePaymentStatus
} from "../controller/paymentController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const paymentRouter = express.Router();

// Record payment
paymentRouter.post(
    "/",
    protect,
    requireRole("advocate"),
    createPayment
);

// View payments
paymentRouter.get(
    "/",
    protect,
    requireRole("advocate", "client", "admin", "junior_advocate"),
    getPayments
);

// Update payment status
paymentRouter.patch(
    "/:paymentId/status",
    protect,
    requireRole("advocate"),
    updatePaymentStatus
);

export default paymentRouter;
