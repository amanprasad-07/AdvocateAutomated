import express from "express";
import {
    uploadEvidence,
    getEvidence
} from "../controller/evidenceController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";

const evidenceRouter = express.Router();

/**
 * Evidence Routes
 *
 * Defines endpoints for uploading and retrieving
 * case-related evidence with role-based access control.
 */

/**
 * POST /
 *
 * Uploads evidence for a case.
 * Accepts multipart form data with a single file field.
 *
 * Access:
 * - Advocates
 * - Junior advocates
 */
evidenceRouter.post(
    "/",
    protect,
    requireRole("advocate", "junior_advocate"),
    upload.single("file"),   // Handles single file upload from multipart request
    uploadEvidence
);

/**
 * GET /
 *
 * Retrieves evidence records based on user role:
 * - Advocates and junior advocates: evidence related to their cases
 * - Admins: unrestricted access for audit and oversight
 */
evidenceRouter.get(
    "/",
    protect,
    requireRole("advocate", "junior_advocate", "admin"),
    getEvidence
);

// Export evidence router for mounting under /api/evidence (or similar)
export default evidenceRouter;
