import express from "express";
import {
    approveAdvocate,
    getPendingAdvocates,
    rejectAdvocate,
} from "../controller/adminController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const adminRouter = express.Router();

// Only admins can access these routes
adminRouter.use(protect, requireRole("admin"));

// GET all pending advocates
adminRouter.get("/pending-advocates", getPendingAdvocates);

// Approve / reject advocate
adminRouter.patch("/advocates/:userId/approve", approveAdvocate);

adminRouter.patch("/advocates/:userId/reject", rejectAdvocate);

export default adminRouter;
