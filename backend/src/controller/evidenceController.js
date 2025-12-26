import Evidence from "../model/evidence.js";
import Case from "../model/case.js";

/**
 * Upload evidence metadata
 *
 * Accessible to Advocate / Junior Advocate roles
 * Handles validation, access control, and evidence creation
 */
export const uploadEvidence = async (req, res, next) => {
    try {
        // Extract evidence metadata from request body
        const {
            title,
            description,
            fileUrl,
            fileType,
            mimeType,
            fileSize,
            caseId,
            taskId,
            isConfidential = false
        } = req.body;

        // Validate presence of required fields
        if (!title || !fileUrl || !fileType || !mimeType || !fileSize || !caseId) {
            const err = new Error("Missing required fields");
            err.statusCode = 400;
            return next(err);
        }

        // Verify that the referenced case exists
        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        /**
         * Access control:
         * - Primary advocate of the case
         * - Or a junior advocate assigned to the case
         */
        const isAdvocate =
            existingCase.advocate.toString() === req.user._id.toString();

        const isAssignedJunior =
            existingCase.assignedJuniors
                .map(id => id.toString())
                .includes(req.user._id.toString());

        if (!isAdvocate && !isAssignedJunior) {
            const err = new Error("Access denied");
            err.statusCode = 403;
            return next(err);
        }

        // Create evidence record
        const evidence = await Evidence.create({
            title,
            description,
            fileUrl,
            fileType,
            mimeType,
            fileSize,
            case: caseId,
            task: taskId,
            uploadedBy: req.user._id,
            isConfidential
        });

        // Send successful upload response
        res.status(201).json({
            success: true,
            message: "Evidence uploaded successfully",
            data: evidence
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};

/**
 * Get evidence (role-based)
 *
 * - Clients: non-confidential evidence for their own cases
 * - Advocates: all evidence for cases they handle
 * - Junior advocates: evidence for cases assigned to them
 * - Admins: unrestricted audit access
 */
export const getEvidence = async (req, res, next) => {
    try {
        let filter = {};

        /**
         * CLIENT ACCESS
         * Clients can view only non-confidential evidence
         * related to their own cases
         */
        if (req.user.role === "client") {
            const clientCases = await Case.find({
                client: req.user._id
            }).select("_id");

            filter.case = { $in: clientCases.map(c => c._id) };
            filter.isConfidential = false;
        }

        /**
         * ADVOCATE ACCESS
         * Advocates can view all evidence for cases they manage
         */
        if (req.user.role === "advocate") {
            const advocateCases = await Case.find({
                advocate: req.user._id
            }).select("_id");

            filter.case = { $in: advocateCases.map(c => c._id) };
        }

        /**
         * JUNIOR ADVOCATE ACCESS
         * Junior advocates can view evidence for assigned cases
         */
        if (req.user.role === "junior_advocate") {
            const assignedCases = await Case.find({
                assignedJuniors: req.user._id
            }).select("_id");

            filter.case = { $in: assignedCases.map(c => c._id) };
        }

        // ADMIN ACCESS
        // No filter applied — full audit visibility

        // Fetch evidence with populated relational data
        const evidenceList = await Evidence.find(filter)
            .populate("uploadedBy", "name email role")
            .populate("case", "caseNumber title")
            .sort({ createdAt: -1 });

        // Send response with evidence list
        res.status(200).json({
            success: true,
            count: evidenceList.length,
            data: evidenceList
        });

    } catch (error) {
        // Forward errors to centralized error handler
        next(error);
    }
};
