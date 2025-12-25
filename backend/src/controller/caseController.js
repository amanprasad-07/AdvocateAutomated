import Case from "../model/case.js";

/**
 * Create a new case
 * Advocate / Junior Advocate only
 */
export const createCase = async (req, res, next) => {
    try {
        const {
            caseNumber,
            title,
            description,
            caseType,
            clientId,
            assignedJuniors = []
        } = req.body;

        if (!caseNumber || !title || !description || !caseType || !clientId) {
            const err = new Error("Missing required fields");
            err.statusCode = 400;
            return next(err);
        }

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
 */
export const getCases = async (req, res, next) => {
    try {
        let filter = {};

        if (req.user.role === "advocate" || req.user.role === "junior_advocate") {
            filter.$or = [
                { advocate: req.user._id },
                { assignedJuniors: req.user._id }
            ];
        }

        if (req.user.role === "client") {
            filter.client = req.user._id;
        }

        const cases = await Case.find(filter)
            .populate("client", "name email")
            .populate("advocate", "name email")
            .populate("assignedJuniors", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: cases.length,
            data: cases
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Update case status
 * Assigned advocate only
 */
export const updateCaseStatus = async (req, res, next) => {
    try {
        const { caseId } = req.params;
        const { status } = req.body;

        if (!["open", "in_progress", "closed"].includes(status)) {
            const err = new Error("Invalid case status");
            err.statusCode = 400;
            return next(err);
        }

        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        // Only assigned advocate can update
        if (existingCase.advocate.toString() !== req.user._id.toString()) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        existingCase.status = status;
        if (status === "closed") {
            existingCase.closedAt = new Date();
        }

        await existingCase.save();

        res.status(200).json({
            success: true,
            message: "Case status updated",
            data: existingCase
        });

    } catch (error) {
        next(error);
    }
};
