import Case from "../model/case.js";

/**
 * Create a new case
 * Accessible to Advocate / Junior Advocate roles only
 */
export const createCase = async (req, res, next) => {
    try {
        // Extract required case details from request body
        const {
            caseNumber,
            title,
            description,
            caseType,
            clientId,
            assignedJuniors = []
        } = req.body;

        // Validate presence of mandatory fields
        if (!caseNumber || !title || !description || !caseType || !clientId) {
            const err = new Error("Missing required fields");
            err.statusCode = 400;
            return next(err);
        }

        // Create new case record
        const newCase = await Case.create({
            caseNumber,
            title,
            description,
            caseType,
            client: clientId,
            advocate: req.user._id,
            assignedJuniors,
            createdBy: req.user._id
        });

        // Send successful creation response
        res.status(201).json({
            success: true,
            message: "Case created successfully",
            data: newCase
        });

    } catch (error) {
        // Forward errors to centralized error handler
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

        // Update case status and closure timestamp if applicable
        existingCase.status = status;
        if (status === "closed") {
            existingCase.closedAt = new Date();
        }

        // Persist changes
        await existingCase.save();

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
