import Evidence from "../model/evidence.js";
import Case from "../model/case.js";

/**
 * Upload evidence metadata
 * Advocate / Junior Advocate
 */
export const uploadEvidence = async (req, res, next) => {
    try {
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

        if (!title || !fileUrl || !fileType || !mimeType || !fileSize || !caseId) {
            const err = new Error("Missing required fields");
            err.statusCode = 400;
            return next(err);
        }

        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        // Advocate or assigned junior only
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
 */
export const getEvidence = async (req, res, next) => {
    try {
        let filter = {};

        // CLIENT: only own cases, non-confidential
        if (req.user.role === "client") {
            const clientCases = await Case.find({
                client: req.user._id
            }).select("_id");

            filter.case = { $in: clientCases.map(c => c._id) };
            filter.isConfidential = false;
        }

        // ADVOCATE: cases they handle
        if (req.user.role === "advocate") {
            const advocateCases = await Case.find({
                advocate: req.user._id
            }).select("_id");

            filter.case = { $in: advocateCases.map(c => c._id) };
        }

        // JUNIOR ADVOCATE: cases assigned to them
        if (req.user.role === "junior_advocate") {
            const assignedCases = await Case.find({
                assignedJuniors: req.user._id
            }).select("_id");

            filter.case = { $in: assignedCases.map(c => c._id) };
        }

        // ADMIN: no filter (audit access)

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
