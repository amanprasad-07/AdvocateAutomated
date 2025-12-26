import Appointment from "../model/appointment.js";
import User from "../model/user.js";

/**
 * Create Appointment
 * ------------------
 * Client requests an appointment with an advocate.
 * Status is set to "requested" by default.
 */
export const createAppointment = async (req, res, next) => {
    try {
        const { advocateId, date, timeSlot, purpose } = req.body;

        if (!advocateId || !date || !timeSlot) {
            const err = new Error("Advocate, date, and time slot are required");
            err.statusCode = 400;
            return next(err);
        }

        // Ensure selected user is an advocate
        const advocate = await User.findById(advocateId);
        if (!advocate || advocate.role !== "advocate") {
            const err = new Error("Invalid advocate");
            err.statusCode = 400;
            return next(err);
        }

        const appointment = await Appointment.create({
            client: req.user._id,
            advocate: advocateId,
            date,
            timeSlot,
            purpose
        });

        res.status(201).json({
            success: true,
            message: "Appointment requested successfully",
            data: appointment
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get Appointments (Role-based)
 * -----------------------------
 * Client → sees their appointments
 * Advocate → sees appointments assigned to them
 * Admin → sees all appointments
 */
export const getAppointments = async (req, res, next) => {
    try {
        let filter = {};

        if (req.user.role === "client") {
            filter.client = req.user._id;
        }

        if (req.user.role === "advocate") {
            filter.advocate = req.user._id;
        }

        const appointments = await Appointment.find(filter)
            .populate("client", "name email")
            .populate("advocate", "name email")
            .sort({ date: 1 });

        res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Update Appointment Status
 * -------------------------
 * Advocate can approve, reject, or mark appointment as completed.
 */
export const updateAppointmentStatus = async (req, res, next) => {
    try {
        const { appointmentId } = req.params;
        const { status, notes } = req.body;

        if (!["approved", "rejected", "completed"].includes(status)) {
            const err = new Error("Invalid appointment status");
            err.statusCode = 400;
            return next(err);
        }

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            const err = new Error("Appointment not found");
            err.statusCode = 404;
            return next(err);
        }

        // Only assigned advocate can update appointment
        if (appointment.advocate.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        appointment.status = status;
        if (notes) appointment.notes = notes;

        await appointment.save();

        res.status(200).json({
            success: true,
            message: "Appointment updated successfully",
            data: appointment
        });

    } catch (error) {
        next(error);
    }
};
