import Appointment from "../model/appointment.js";
import User from "../model/user.js";

/**
 * Create Appointment Controller
 *
 * Allows a client to request an appointment with an advocate.
 * Newly created appointments default to the "requested" status.
 */
export const createAppointment = async (req, res, next) => {
    try {
        // Extract appointment request details
        const { advocateId, date, timeSlot, purpose } = req.body;

        // Validate required appointment fields
        if (!advocateId || !date || !timeSlot) {
            const err = new Error("Advocate, date, and time slot are required");
            err.statusCode = 400;
            return next(err);
        }

        // Ensure the selected user is a valid, approved advocate
        const advocate = await User.findById(advocateId);
        if (
            !advocate ||
            advocate.role !== "advocate" ||
            advocate.verificationStatus !== "approved"
        ) {
            const err = new Error("Invalid advocate");
            err.statusCode = 400;
            return next(err);
        }

        // Normalize and validate appointment date
        const appointmentDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Prevent booking appointments in the past
        if (appointmentDate < today) {
            const err = new Error("Appointment date cannot be in the past");
            err.statusCode = 400;
            return next(err);
        }

        // Prevent double booking for the same advocate, date, and time slot
        const existingAppointment = await Appointment.findOne({
            advocate: advocateId,
            date,
            timeSlot,
            status: { $in: ["requested", "approved"] }
        });

        if (existingAppointment) {
            const err = new Error(
                "This time slot is already booked for the selected advocate"
            );
            err.statusCode = 400;
            return next(err);
        }

        // Create appointment record
        const appointment = await Appointment.create({
            client: req.user._id,
            advocate: advocateId,
            date,
            timeSlot,
            purpose
        });

        // Respond with appointment creation confirmation
        res.status(201).json({
            success: true,
            message: "Appointment requested successfully",
            data: appointment
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};

/**
 * Get Appointments Controller (Role-Based)
 *
 * - Client: retrieves their own appointments
 * - Advocate: retrieves appointments assigned to them
 * - Admin: retrieves all appointments
 */
export const getAppointments = async (req, res, next) => {
    try {
        let filter = {};

        // Client can only view their own appointments
        if (req.user.role === "client") {
            filter.client = req.user._id;
        }

        // Advocate can only view their own appointments
        // Excludes appointments that already resulted in a case
        if (req.user.role === "advocate") {
            filter.advocate = req.user._id;
            filter.caseCreated = { $ne: true };
        }

        // Fetch appointments with related user details
        const appointments = await Appointment.find(filter)
            .populate("client", "name email")
            .populate("advocate", "name email")
            .sort({ date: 1 });

        // Respond with appointment list
        res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};

/**
 * Update Appointment Status Controller
 *
 * Allows the assigned advocate to approve or reject
 * a requested appointment.
 */
export const updateAppointmentStatus = async (req, res, next) => {
    try {
        // Extract appointment identifier and desired status
        const { appointmentId } = req.params;
        const { status, notes } = req.body;

        // Validate allowed status transitions
        if (!["approved", "rejected"].includes(status)) {
            const err = new Error("Invalid appointment status");
            err.statusCode = 400;
            return next(err);
        }

        // Fetch appointment record
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            const err = new Error("Appointment not found");
            err.statusCode = 404;
            return next(err);
        }

        // Ensure only the assigned advocate can update the appointment
        if (appointment.advocate.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        // Enforce valid workflow transitions
        if (appointment.status !== "requested") {
            const err = new Error(
                `Appointment cannot be ${status} once it is ${appointment.status}`
            );
            err.statusCode = 400;
            return next(err);
        }

        // Rejection must include a reason
        if (status === "rejected" && (!notes || notes.trim() === "")) {
            const err = new Error("Rejection reason is required");
            err.statusCode = 400;
            return next(err);
        }

        // Apply status update and optional notes
        appointment.status = status;
        if (notes) appointment.notes = notes;

        // Persist appointment changes
        await appointment.save();

        // Respond with update confirmation
        res.status(200).json({
            success: true,
            message: `Appointment ${status} successfully`,
            data: appointment
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};
