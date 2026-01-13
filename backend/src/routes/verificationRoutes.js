import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { submitAdvocateProfile } from "../controller/credentials.js";

const verificationRouter = express.Router();

/**
 * Verification Routes
 *
 * Handles submission of advocate and junior advocate
 * verification credentials.
 */

/**
 * PATCH /profile
 *
 * Allows advocates and junior advocates to submit
 * their professional credentials for verification.
 *
 * Access:
 * - Advocate
 * - Junior Advocate
 */
verificationRouter.patch(
    "/profile",
    protect,
    requireRole("advocate", "junior_advocate"),
    submitAdvocateProfile
);

// Export verification router for mounting under /api/verification (or similar)
export default verificationRouter;
