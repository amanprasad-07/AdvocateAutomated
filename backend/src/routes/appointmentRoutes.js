import express from "express";
import {
    completeAppointment,
    createAppointment,
    getAppointmentById,
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

/**
 * Advocate marks consultation as completed
 * ONLY after approval
 */
appointmentRouter.patch(
  "/:appointmentId/complete",
   protect,
    requireRole("advocate"),
  completeAppointment
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
 * GET /:appointmentId
 *
 * Fetch a single appointment with full context.
 * Used during case creation.
 */
appointmentRouter.get(
  "/:appointmentId",
  protect,
  requireRole("client", "advocate", "admin"),
  getAppointmentById
);

export default appointmentRouter;
