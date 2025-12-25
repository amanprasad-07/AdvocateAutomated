import express from "express";
import {
    createCase,
    getCases,
    updateCaseStatus
} from "../controller/caseController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const caseRouter = express.Router();

// Create case
caseRouter.post(
    "/",
    protect,
    requireRole("advocate"),
    createCase
);

// Get cases (role-based)
caseRouter.get(
    "/",
    protect,
    getCases
);

// Update case status
caseRouter.patch(
    "/:caseId/status",
    protect,
    requireRole("advocate"),
    updateCaseStatus
);

export default caseRouter;
