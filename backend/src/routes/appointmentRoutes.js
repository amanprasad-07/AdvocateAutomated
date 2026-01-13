import express from "express";
import {
    createAppointment,
    getAppointments,
    updateAppointmentStatus
} from "../controller/appointmentController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const appointmentRouter = express.Router();

/**
 * Appointment Routes
 *
 * Defines endpoints for creating, viewing,
 * and managing appointments.
 */

/**
 * POST /
 *
 * Allows a client to request an appointment
 * with an advocate.
 */
appointmentRouter.post(
    "/",
    protect,
    requireRole("client"),
    createAppointment
);

/**
 * GET /
 *
 * Retrieves appointments based on user role:
 * - Client: own appointments
 * - Advocate: appointments assigned to them
 * - Admin: all appointments
 */
appointmentRouter.get(
    "/",
    protect,
    requireRole("client", "advocate", "admin"),
    getAppointments
);

/**
 * PATCH /:appointmentId/status
 *
 * Allows an advocate to approve or reject
 * a requested appointment.
 */
appointmentRouter.patch(
    "/:appointmentId/status",
    protect,
    requireRole("advocate"),
    updateAppointmentStatus
);

export default appointmentRouter;
