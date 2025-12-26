import express from "express";
import {
    uploadEvidence,
    getEvidence
} from "../controller/evidenceController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import upload from "../config/multer.js";

const evidenceRouter = express.Router();

/**
 * Evidence routes
 *
 * Handles uploading and viewing of evidence
 * with strict role-based access control.
 */

/**
 * POST /
 *
 * Upload evidence metadata.
 * Accessible to advocates and junior advocates only.
 */
evidenceRouter.post(
    "/",
    protect,
    requireRole("advocate", "junior_advocate"),
    upload.single("file"),   // 🔑 THIS IS THE KEY
    uploadEvidence
);

/**
 * GET /
 *
 * Retrieve evidence based on user role:
 * - Advocates / junior advocates: related case evidence
 * - Clients: non-confidential evidence for their cases
 * - Admins: full audit access
 */
evidenceRouter.get(
    "/",
    protect,
    requireRole("advocate", "junior_advocate", "client", "admin"),
    getEvidence
);

// Export evidence router for mounting under /api/evidence (or similar)
export default evidenceRouter;
