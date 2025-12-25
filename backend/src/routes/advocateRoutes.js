import express from "express";
import { getAdvocateDashboard } from "../controller/advocateController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const advocateRouter = express.Router();

// Advocate dashboard (pending or approved can access)
advocateRouter.get(
    "/dashboard",
    protect,
    requireRole("advocate", "junior_advocate"),
    getAdvocateDashboard
);

export default advocateRouter;
