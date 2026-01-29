import Appointment from "../model/appointment.js";
import User from "../model/user.js";

export const createAppointment = async (req, res, next) => {
  try {
    const {
      advocateId,
      date,
      timeSlot,
      purpose,
      aiAnalysis
    } = req.body;

    /**
     * -----------------------------------
     * AI ANALYSIS IS MANDATORY
     * -----------------------------------
     */
    if (
      !aiAnalysis ||
      !aiAnalysis.input ||
      !aiAnalysis.output ||
      !aiAnalysis.meta
    ) {
      const err = new Error(
        "AI case analysis is required before booking an appointment"
      );
      err.statusCode = 400;
      return next(err);
    }

    const {
      input,
      output,
      meta
    } = aiAnalysis;

    // Validate AI input fields
    if (
      !input.description ||
      !input.category ||
      !input.urgency ||
      !input.hasDocuments ||
      !input.location
    ) {
      const err = new Error("Incomplete AI input data");
      err.statusCode = 400;
      return next(err);
    }

    // Validate AI output fields
    if (
      !output.caseType ||
      !output.urgency ||
      !output.evidenceReadiness ||
      !output.recommendedSpecialization ||
      !Array.isArray(output.nextSteps)
    ) {
      const err = new Error("Incomplete AI output data");
      err.statusCode = 400;
      return next(err);
    }

    // Validate appointment basics
    if (!advocateId || !date || !timeSlot) {
      const err = new Error("Advocate, date, and time slot are required");
      err.statusCode = 400;
      return next(err);
    }

    /**
     * -----------------------------------
     * VALIDATE ADVOCATE
     * -----------------------------------
     */
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

    /**
     * -----------------------------------
     * DATE VALIDATION
     * -----------------------------------
     */
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      const err = new Error("Appointment date cannot be in the past");
      err.statusCode = 400;
      return next(err);
    }

    /**
     * -----------------------------------
     * PREVENT DOUBLE BOOKING
     * -----------------------------------
     */
    const existingAppointment = await Appointment.findOne({
      advocate: advocateId,
      date,
      timeSlot,
      status: { $in: ["requested", "approved"] },
    });

    if (existingAppointment) {
      const err = new Error(
        "This time slot is already booked for the selected advocate"
      );
      err.statusCode = 400;
      return next(err);
    }

    /**
     * -----------------------------------
     * CREATE APPOINTMENT WITH AI CONTEXT
     * -----------------------------------
     */
    const appointment = await Appointment.create({
      client: req.user._id,
      advocate: advocateId,
      date,
      timeSlot,
      purpose,

      aiAnalysis: {
        input,
        output,
        meta: {
          provider: meta.provider,
          model: meta.model,
          generatedAt: meta.generatedAt || new Date(),
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Appointment requested successfully",
      data: appointment,
    });

  } catch (error) {
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
 * Get Single Appointment by ID
 *
 * Used by advocates during case creation
 * to fetch full appointment + AI context.
 */
export const getAppointmentById = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate("client", "name email")
      .populate("advocate", "name email");

    if (!appointment) {
      const err = new Error("Appointment not found");
      err.statusCode = 404;
      return next(err);
    }

    /**
     * Access control:
     * - Client can view only their appointment
     * - Advocate can view only assigned appointments
     * - Admin can view all
     */
    if (
      req.user.role === "client" &&
      appointment.client._id.toString() !== req.user._id.toString()
    ) {
      const err = new Error("Access denied");
      err.statusCode = 403;
      return next(err);
    }

    if (
      req.user.role === "advocate" &&
      appointment.advocate._id.toString() !== req.user._id.toString()
    ) {
      const err = new Error("Access denied");
      err.statusCode = 403;
      return next(err);
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
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

export const completeAppointment = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.advocate.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (appointment.status !== "approved") {
      return res.status(400).json({
        message: "Only approved appointments can be completed",
      });
    }

    appointment.status = "completed";
    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Appointment marked as completed",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

