import Evidence from "../model/evidence.js";
import Case from "../model/case.js";

/**
 * Upload evidence metadata
 *
 * Accessible to Advocate / Junior Advocate roles
 * Handles validation, access control, and evidence creation
 */
/**
 * Upload Evidence
 * Advocate / Junior Advocate
 */
export const uploadEvidence = async (req, res, next) => {
    try {
        const { caseId, description } = req.body;

        if (!req.file || !caseId) {
            const err = new Error("File and caseId are required");
            err.statusCode = 400;
            return next(err);
        }

        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        const fileType =
            req.file.mimetype === "application/pdf" ? "pdf" : "image";

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

        res.status(201).json({
            success: true,
            message: "Evidence uploaded successfully",
            data: evidence
        });

    } catch (error) {
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
         * Optional case-based filtering (frontend-friendly)
         */
        if (req.query.caseId) {
            filter.case = req.query.caseId;
        }

        /**
         * CLIENT ACCESS
         * Clients can view non-confidential evidence
         * related to their own cases
         */
        if (req.user.role === "client") {
            const clientCases = await Case.find({
                client: req.user._id
            }).select("_id");

            filter.case = { $in: clientCases.map(c => c._id) };
            // Apply only if schema supports it
            filter.isConfidential = { $ne: true };
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
         * Juniors can see:
         * - Evidence they uploaded
         * - Evidence for assigned cases (if assigned)
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

        // ADMIN ACCESS → no filter override

        const evidenceList = await Evidence.find(filter)
            .populate("uploadedBy", "name email role")
            .populate("case", "caseNumber title")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: evidenceList.length,
            data: evidenceList
        });

    } catch (error) {
        next(error);
    }
};
