import express from "express";
import { getJuniorDashboard } from "../controller/juniorController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const juniorRouter = express.Router();

juniorRouter.get(
    "/dashboard",
    protect,
    requireRole("junior_advocate"),
    getJuniorDashboard
);

export default juniorRouter;
