import Evidence from "../model/evidence.js";
import Case from "../model/case.js";
import { logAuditEvent } from "../utils/auditLogger.js";
import cloudinary from "../utils/cloudinary.js";

/* ---------- Helper ---------- */

/**
 * Derives a high-level file category based on MIME type.
 *
 * Used to normalize different file formats into
 * document, image, audio, video, or other.
 *
 * @param {string} mimeType - MIME type of the uploaded file
 * @returns {string} Derived file category
 */
const deriveFileType = (mimeType) => {
    if (!mimeType) return "other";

    // -------- Documents --------
    // Common document formats supported by the system
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
    // Any standard image MIME type
    if (mimeType.startsWith("image/")) {
        return "image";
    }

    // -------- Audio --------
    // Audio recordings and sound files
    if (mimeType.startsWith("audio/")) {
        return "audio";
    }

    // -------- Video --------
    // Video recordings and clips
    if (mimeType.startsWith("video/")) {
        return "video";
    }

    // Fallback for unsupported or unknown types
    return "other";
};

/**
 * Upload Evidence Controller
 *
 * Handles secure evidence uploads for a case.
 * Validates case state, uploads files to Cloudinary,
 * stores metadata in the database, and logs audit events.
 */
export const uploadEvidence = async (req, res, next) => {
    try {
        const { caseId, description } = req.body;

        // Ensure required inputs are present
        if (!req.file || !caseId) {
            const err = new Error("File and caseId are required");
            err.statusCode = 400;
            return next(err);
        }

        // Verify the target case exists
        const existingCase = await Case.findById(caseId);
        if (!existingCase) {
            const err = new Error("Case not found");
            err.statusCode = 404;
            return next(err);
        }

        // Prevent uploads to closed cases
        if (existingCase.status === "closed") {
            const err = new Error(
                "Case is completed. No further changes are allowed."
            );
            err.statusCode = 403;
            return next(err);
        }

        // Automatically move case from OPEN to IN_PROGRESS on first evidence upload
        if (existingCase.status === "open") {
            existingCase.status = "in_progress";
            await existingCase.save();
        }

        // Derive normalized file category
        const fileType = deriveFileType(req.file.mimetype);

        // PDFs are treated as raw resources in Cloudinary
        const isPdf = req.file.mimetype === "application/pdf";

        // Upload file buffer to Cloudinary using a stream
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

        // Persist evidence metadata in the database
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

        // Attempt to log the audit event without blocking the main flow
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
            // Audit logging failures are intentionally non-fatal
            console.warn(
                "Audit logging failed:",
                auditError.message
            );
        }

        // Return created evidence record
        res.status(201).json({
            success: true,
            message: "Evidence uploaded successfully",
            data: evidence,
        });
    } catch (error) {
        // Forward unexpected errors to the global error handler
        next(error);
    }
};

/**
 * Get Evidence Controller (Role-Based Access)
 *
 * Retrieves evidence records based on the requesting user's role
 * and optional case-level filtering.
 */
export const getEvidence = async (req, res, next) => {
    try {
        const caseId = req.query.caseId;
        let roleFilter = {};

        /* ---------- ADVOCATE ---------- */
        // Advocates can access evidence for cases they own
        if (req.user.role === "advocate") {
            const advocateCases = await Case.find({
                advocate: req.user._id,
            }).select("_id");

            roleFilter.case = {
                $in: advocateCases.map(c => c._id),
            };
        }

        /* ---------- JUNIOR ADVOCATE ---------- */
        // Junior advocates can access their own uploads
        // and evidence from cases they are assigned to
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
        // Apply optional case-specific filtering
        const finalFilter = caseId
            ? { $and: [roleFilter, { case: caseId }] }
            : roleFilter;

        // Fetch evidence with related user and case details
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
        // Forward unexpected errors to the global error handler
        next(error);
    }
};
