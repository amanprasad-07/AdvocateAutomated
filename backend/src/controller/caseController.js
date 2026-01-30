import Case from "../model/case.js";
import Appointment from "../model/appointment.js";
import User from "../model/user.js"
import { normalizeAiOutput } from "../utils/normalize-ai-output.js";

/**
 * Create Case Controller
 *
 * Converts an approved appointment into a formal case.
 * Only the advocate assigned to the appointment is allowed
 * to create the corresponding case.
 */
export const createCase = async (req, res, next) => {
  try {
    const {
      appointmentId,
      title,
      assignedJuniors = []
    } = req.body;

    if (!appointmentId || !title) {
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
      const err = new Error("A case already exists for this appointment");
      err.statusCode = 400;
      return next(err);
    }

    if (appointment.status !== "completed") {
      const err = new Error(
        "Consultation must be completed before creating a case"
      );
      err.statusCode = 400;
      return next(err);
    }

    if (appointment.advocate.toString() !== req.user._id.toString()) {
      const err = new Error("Access denied");
      err.statusCode = 403;
      return next(err);
    }

    /**
     * AI DATA IS THE SOURCE OF TRUTH
     */
    const rawAiOutput = appointment.aiAnalysis?.output;
    if (!rawAiOutput) {
      const err = new Error(
        "AI case analysis is required before creating a case"
      );
      err.statusCode = 400;
      return next(err);
    }

    // -----------------------------------
    // NORMALIZE AI OUTPUT 
    // -----------------------------------
    const aiOutput = normalizeAiOutput(rawAiOutput);


    if (!aiOutput) {
      const err = new Error(
        "AI case analysis is required before creating a case"
      );
      err.statusCode = 400;
      return next(err);
    }

    const allowedSpecializations = [
      "Civil",
      "Criminal",
      "Family",
      "Property",
      "Corporate",
      "Consumer Protection",
      "Labour",
      "Intellectual Property",
      "Tax",
      "Personal Injury",
      "Other"
    ];

    const specialization = allowedSpecializations.includes(
      aiOutput.recommendedSpecialization
    )
      ? aiOutput.recommendedSpecialization
      : "Other";

    const caseNumber = `CASE-${Date.now()}`;

    const derivedDescription = `
AI Case Summary
---------------
Case Type: ${aiOutput.caseType}
Urgency: ${aiOutput.urgency}
Evidence Readiness: ${aiOutput.evidenceReadiness}

Suggested Next Steps:
${aiOutput.nextSteps.join("\n")}

--------------------------------
Advocate Notes:
`;

    // Validate assigned junior advocates
    if (assignedJuniors.length > 0) {
      const validJuniors = await User.find({
        _id: { $in: assignedJuniors },
        role: "junior_advocate",
        verificationStatus: "approved"
      }).select("_id");

      if (validJuniors.length !== assignedJuniors.length) {
        const err = new Error("One or more assigned juniors are invalid");
        err.statusCode = 400;
        return next(err);
      }
    }


    const newCase = await Case.create({
      caseNumber,
      title,
      description: derivedDescription,
      specialization,

      aiAnalysis: {
        urgency: aiOutput.urgency,
        evidenceReadiness: aiOutput.evidenceReadiness,
        suggestedNextSteps: aiOutput.nextSteps,
      },

      client: appointment.client,
      advocate: appointment.advocate,
      appointment: appointment._id,
      assignedJuniors,
      createdBy: req.user._id,
    });

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
 * Get Cases Controller (Role-Based)
 *
 * - Advocates and junior advocates see cases assigned to them
 * - Clients see only their own cases
 * - Admins see all cases by default
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

    // Fetch cases with related user details
    const cases = await Case.find(filter)
      .populate("client", "name email")
      .populate("advocate", "name email")
      .populate("assignedJuniors", "name email")
      .sort({ createdAt: -1 });

    // Respond with case list
    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases
    });

  } catch (error) {
    // Forward unexpected errors to centralized error handler
    next(error);
  }
};

/**
 * Update Case Status Controller
 *
 * Allows the assigned advocate to update
 * the lifecycle status of a case.
 */
export const updateCaseStatus = async (req, res, next) => {
  try {
    // Extract case identifier and desired status
    const { caseId } = req.params;
    const { status } = req.body;

    // Validate allowed case status values
    if (!["open", "in_progress", "closed"].includes(status)) {
      const err = new Error("Invalid case status");
      err.statusCode = 400;
      return next(err);
    }

    // Fetch case record
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

    // Prevent modifications to closed cases
    if (existingCase.status === "closed") {
      const err = new Error("Closed cases cannot be modified");
      err.statusCode = 400;
      return next(err);
    }

    // Define valid state transitions
    const validTransitions = {
      open: ["in_progress"],
      in_progress: ["closed"],
      closed: []
    };

    // Enforce valid workflow transitions
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

    // Record status change in case history
    existingCase.caseHistory.push({
      note: `Case status changed to ${status.replace("_", " ")}`,
      addedBy: req.user._id,
    });

    // Persist case updates
    await existingCase.save({ validateBeforeSave: false });

    // Respond with status update confirmation
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

/**
 * Get Case By ID Controller
 *
 * Retrieves a single case with role-based access control.
 */
export const getCaseById = async (req, res, next) => {
  try {
    const { caseId } = req.params;

    // Fetch case with related user details
    const caseData = await Case.findById(caseId)
      .populate("client", "name email")
      .populate("advocate", "name email")
      .populate("assignedJuniors", "name email")
      .populate("appointment");


    if (!caseData) {
      const err = new Error("Case not found");
      err.statusCode = 404;
      return next(err);
    }

    const userId = req.user._id.toString();

    // Determine role-based access
    const isAdvocate =
      caseData.advocate._id.toString() === userId;

    const isJunior =
      caseData.assignedJuniors.some(
        (j) => j._id.toString() === userId
      );

    const isClient =
      caseData.client._id.toString() === userId;

    // Enforce access control
    if (!isAdvocate && !isJunior && !isClient && req.user.role !== "admin") {
      const err = new Error("Access denied");
      err.statusCode = 403;
      return next(err);
    }

    // Respond with case details
    res.status(200).json({
      success: true,
      data: caseData
    });

  } catch (error) {
    next(error);
  }
};


