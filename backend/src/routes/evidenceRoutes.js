import express from "express";
import {
    uploadEvidence,
    getEvidence
} from "../controller/evidenceController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const evidenceRouter = express.Router();

// Upload evidence
evidenceRouter.post(
    "/",
    protect,
    requireRole("advocate", "junior_advocate"),
    uploadEvidence
);

// View evidence
evidenceRouter.get(
    "/",
    protect,
    requireRole("advocate", "junior_advocate", "client", "admin"),
    getEvidence
);

export default evidenceRouter;
