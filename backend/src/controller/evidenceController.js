import Evidence from "../model/evidence.js";
import Case from "../model/case.js";

/**
 * Evidence Controller
 *
 * Handles file-based evidence uploads using Multer
 * and role-based evidence retrieval.
 */

/**
 * Upload Evidence
 *
 * Accessible to:
 * - Advocate
 * - Junior Advocate
 *
 * Responsibilities:
 * - Validate file presence and case reference
 * - Verify case existence
 * - Persist uploaded file metadata to database
 */
export const uploadEvidence = async (req, res, next) => {
    try {
        // Extract required fields from request
        const { caseId, description } = req.body;

        // Validate required inputs
        if (!req.file || !caseId) {
            const err = new Error("File and caseId are required");
            err.statusCode = 400;
            return next(err);
        }

        // Ensure the referenced case exists
        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        // Determine logical file type based on MIME type
        const fileType =
            req.file.mimetype === "application/pdf" ? "pdf" : "image";

        // Create evidence metadata record
        const evidence = await Evidence.create({
            case: caseId,
            uploadedBy: req.user._id,
            title: req.file.originalname,
            fileName: req.file.originalname,
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            fileType,
            description
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
 * Get Evidence (role-based access)
 *
 * Access rules:
 * - Clients: non-confidential evidence for their own cases
 * - Advocates: all evidence for cases they manage
 * - Junior Advocates:
 *      • Evidence they uploaded
 *      • Evidence for cases they are assigned to
 * - Admins: unrestricted audit access
 */
export const getEvidence = async (req, res, next) => {
    try {
        let filter = {};

        /**
         * Optional query-based filtering
         * Allows frontend to request evidence for a specific case
         */
        if (req.query.caseId) {
            filter.case = req.query.caseId;
        }

        /**
         * CLIENT ACCESS
         *
         * Clients can only view:
         * - Evidence linked to their own cases
         * - Non-confidential evidence
         */
        if (req.user.role === "client") {
            const clientCases = await Case.find({
                client: req.user._id
            }).select("_id");

            filter.case = { $in: clientCases.map(c => c._id) };

            // Apply confidentiality restriction (if supported by schema)
            filter.isConfidential = { $ne: true };
        }

        /**
         * ADVOCATE ACCESS
         *
         * Advocates can view all evidence
         * for cases they are assigned to
         */
        if (req.user.role === "advocate") {
            const advocateCases = await Case.find({
                advocate: req.user._id
            }).select("_id");

            filter.case = { $in: advocateCases.map(c => c._id) };
        }

        /**
         * JUNIOR ADVOCATE ACCESS
         *
         * Juniors can view:
         * - Evidence they personally uploaded
         * - Evidence for cases they are assigned to
         */
        if (req.user.role === "junior_advocate") {
            const assignedCases = await Case.find({
                assignedJuniors: req.user._id
            }).select("_id");

            filter.$or = [
                { uploadedBy: req.user._id },
                { case: { $in: assignedCases.map(c => c._id) } }
            ];
        }

        /**
         * ADMIN ACCESS
         *
         * No additional filtering applied
         * Full audit visibility
         */

        // Fetch evidence with populated relational context
        const evidenceList = await Evidence.find(filter)
            .populate("uploadedBy", "name email role")
            .populate("case", "caseNumber title")
            .sort({ createdAt: -1 });

        // Send response
        res.status(200).json({
            success: true,
            count: evidenceList.length,
            data: evidenceList
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};
