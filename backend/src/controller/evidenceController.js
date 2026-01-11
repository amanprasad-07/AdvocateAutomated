import Evidence from "../model/evidence.js";
import Case from "../model/case.js";
import { logAuditEvent } from "../utils/auditLogger.js";
import cloudinary from "../utils/cloudinary.js";

/* ---------- Helper ---------- */
const deriveFileType = (mimeType) => {
    if (!mimeType) return "other";

    // -------- Documents --------
    if (
        mimeType === "application/pdf" ||
        mimeType === "application/msword" || // .doc
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || // .docx
        mimeType === "application/vnd.ms-excel" || // .xls
        mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || // .xlsx
        mimeType === "text/plain" // .txt
    ) {
        return "document";
    }

    // -------- Images --------
    if (mimeType.startsWith("image/")) {
        return "image";
    }

    // -------- Audio --------
    if (mimeType.startsWith("audio/")) {
        return "audio";
    }

    // -------- Video --------
    if (mimeType.startsWith("video/")) {
        return "video";
    }

    return "other";
};


/**
 * Upload Evidence
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

        if (existingCase.status === "closed") {
            const err = new Error(
                "Case is completed. No further changes are allowed."
            );
            err.statusCode = 403;
            return next(err);
        }

        // Auto-transition: OPEN → IN_PROGRESS
        if (existingCase.status === "open") {
            existingCase.status = "in_progress";
            await existingCase.save();
        }

        const fileType = deriveFileType(req.file.mimetype);

        const isPdf = req.file.mimetype === "application/pdf";

        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: `case_evidence/${caseId}`,
                    resource_type: isPdf ? "raw" : "auto",
                    access_mode: "public",
                    use_filename: true,
                    unique_filename: true,
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            ).end(req.file.buffer);
        });


        const evidence = await Evidence.create({
            case: caseId,
            uploadedBy: req.user._id,
            title: req.file.originalname,
            fileName: req.file.originalname,
            filePath: uploadResult.secure_url,
            cloudinaryId: uploadResult.public_id,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            fileType,
            description,
        });

        try {
            await logAuditEvent({
                action: "EVIDENCE_UPLOADED",
                entityType: "Evidence",
                entityId: evidence._id,
                performedBy: req.user._id,
                message: `Evidence uploaded for case ${caseId}`,
                metadata: {
                    role: req.user.role,
                    email: req.user.email,
                },
            });
        } catch (auditError) {
            console.warn(
                "Audit logging failed:",
                auditError.message
            );
        }

        res.status(201).json({
            success: true,
            message: "Evidence uploaded successfully",
            data: evidence,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Evidence (role-based access)
 */
export const getEvidence = async (req, res, next) => {
    try {
        const caseId = req.query.caseId;
        let roleFilter = {};

        /* ---------- ADVOCATE ---------- */
        if (req.user.role === "advocate") {
            const advocateCases = await Case.find({
                advocate: req.user._id,
            }).select("_id");

            roleFilter.case = {
                $in: advocateCases.map(c => c._id),
            };
        }

        /* ---------- JUNIOR ADVOCATE ---------- */
        if (req.user.role === "junior_advocate") {
            const assignedCases = await Case.find({
                assignedJuniors: req.user._id,
            }).select("_id");

            roleFilter.$or = [
                { uploadedBy: req.user._id },
                { case: { $in: assignedCases.map(c => c._id) } },
            ];
        }

        /* ---------- COMBINE WITH caseId ---------- */
        const finalFilter = caseId
            ? { $and: [roleFilter, { case: caseId }] }
            : roleFilter;

        const evidenceList = await Evidence.find(finalFilter)
            .populate("uploadedBy", "name email role")
            .populate("case", "caseNumber title")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: evidenceList.length,
            data: evidenceList,
        });
    } catch (error) {
        next(error);
    }
};

