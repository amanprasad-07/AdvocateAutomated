import express from "express";
import {
    createAppointment,
    getAppointments,
    updateAppointmentStatus
} from "../controller/appointmentController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const appointmentRouter = express.Router();

/**
 * Client requests an appointment
 */
appointmentRouter.post(
    "/",
    protect,
    requireRole("client"),
    createAppointment
);

/**
 * Get appointments (role-based)
 * Client → own appointments
 * Advocate → assigned appointments
 * Admin → all appointments
 */
appointmentRouter.get(
    "/",
    protect,
    requireRole("client", "advocate", "admin"),
    getAppointments
);

/**
 * Advocate updates appointment status
 * Approve / Reject / Complete
 */
appointmentRouter.patch(
    "/:appointmentId/status",
    protect,
    requireRole("advocate"),
    updateAppointmentStatus
);

export default appointmentRouter;
