import Case from "../model/case.js";
import Appointment from "../model/appointment.js";

export const createCase = async (req, res, next) => {
  try {
    const {
      appointmentId,
      title,
      description,
      caseType,
      assignedJuniors = []
    } = req.body;

    if (!appointmentId || !title || !description || !caseType) {
      const err = new Error("Missing required fields");
      err.statusCode = 400;
      return next(err);
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      const err = new Error("Appointment not found");
      err.statusCode = 404;
      return next(err);
    }

    const existingCase = await Case.findOne({ appointment: appointmentId });

    if (existingCase) {
      const err = new Error("A case has already been created for this appointment");
      err.statusCode = 400;
      return next(err);
    }

    if (appointment.status !== "approved") {
      const err = new Error(
        "Appointment must be approved before creating a case"
      );
      err.statusCode = 400;
      return next(err);
    }

    if (appointment.advocate.toString() !== req.user._id.toString()) {
      const err = new Error("Access denied");
      err.statusCode = 403;
      return next(err);
    }

    const caseNumber = `CASE-${Date.now()}`;

    const newCase = await Case.create({
      caseNumber,
      title,
      description,
      caseType,
      client: appointment.client,
      advocate: appointment.advocate,
      appointment: appointment._id,
      assignedJuniors,
      createdBy: req.user._id,
    });

    // MARK APPOINTMENT AS CONVERTED & COMPLETED
    appointment.status = "completed";
    appointment.caseCreated = true;
    appointment.linkedCase = newCase._id;
    await appointment.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: "Case created successfully",
      data: newCase
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Get cases (role-based)
 *
 * - Advocates and junior advocates see cases assigned to them
 * - Clients see only their own cases
 * - Admins (if enabled) would see all cases by default
 */
export const getCases = async (req, res, next) => {
  try {
    let filter = {};

    // Restrict case visibility for advocates and junior advocates
    if (req.user.role === "advocate" || req.user.role === "junior_advocate") {
      filter.$or = [
        { advocate: req.user._id },
        { assignedJuniors: req.user._id }
      ];
    }

    // Restrict case visibility for clients
    if (req.user.role === "client") {
      filter.client = req.user._id;
    }

    // Fetch cases with populated relational data
    const cases = await Case.find(filter)
      .populate("client", "name email")
      .populate("advocate", "name email")
      .populate("assignedJuniors", "name email")
      .sort({ createdAt: -1 });

    // Send response with case list
    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases
    });

  } catch (error) {
    // Forward unexpected errors to error handler
    next(error);
  }
};

/**
 * Update case status
 *
 * Accessible only to the advocate assigned to the case
 */
export const updateCaseStatus = async (req, res, next) => {
  try {
    // Extract case ID and desired status
    const { caseId } = req.params;
    const { status } = req.body;

    // Validate provided case status
    if (!["open", "in_progress", "closed"].includes(status)) {
      const err = new Error("Invalid case status");
      err.statusCode = 400;
      return next(err);
    }

    // Fetch case by ID
    const existingCase = await Case.findById(caseId);
    if (!existingCase) {
      const err = new Error("Case not found");
      err.statusCode = 404;
      return next(err);
    }


    // Ensure only the assigned advocate can update case status
    if (existingCase.advocate.toString() !== req.user._id.toString()) {
      const err = new Error("Access denied");
      err.statusCode = 403;
      return next(err);
    }

    if (existingCase.status === "closed") {
      const err = new Error("Closed cases cannot be modified");
      err.statusCode = 400;
      return next(err);
    }

    const validTransitions = {
      open: ["in_progress"],
      in_progress: ["closed"],
      closed: []
    };

    if (!validTransitions[existingCase.status].includes(status)) {
      const err = new Error(
        `Cannot change status from ${existingCase.status} to ${status}`
      );
      err.statusCode = 400;
      return next(err);
    }

    // Update case status and closure timestamp if applicable
    existingCase.status = status;
    if (status === "closed") {
      existingCase.closedAt = new Date();
    }

    existingCase.caseHistory.push({
      note: `Case status changed to ${status.replace("_", " ")}`,
      addedBy: req.user._id,
    });

    // Persist changes
    await existingCase.save({ validateBeforeSave: false });

    // Send confirmation response
    res.status(200).json({
      success: true,
      message: "Case status updated",
      data: existingCase
    });

  } catch (error) {
    // Forward errors to centralized error handler
    next(error);
  }
};

// Get case by ID (role-based access)
export const getCaseById = async (req, res, next) => {
  try {
    const { caseId } = req.params;

    const caseData = await Case.findById(caseId)
      .populate("client", "name email")
      .populate("advocate", "name email")
      .populate("assignedJuniors", "name email");

    if (!caseData) {
      const err = new Error("Case not found");
      err.statusCode = 404;
      return next(err);
    }

    const userId = req.user._id.toString();

    const isAdvocate =
      caseData.advocate._id.toString() === userId;

    const isJunior =
      caseData.assignedJuniors.some(
        (j) => j._id.toString() === userId
      );

    const isClient =
      caseData.client._id.toString() === userId;

    if (!isAdvocate && !isJunior && !isClient && req.user.role !== "admin") {
      const err = new Error("Access denied");
      err.statusCode = 403;
      return next(err);
    }

    res.status(200).json({
      success: true,
      data: caseData
    });

  } catch (error) {
    next(error);
  }
};