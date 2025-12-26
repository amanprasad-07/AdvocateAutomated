import express from "express";
import { getClientDashboard } from "../controller/clientController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const clientRouter = express.Router();

clientRouter.get(
    "/dashboard",
    protect,
    requireRole("client"),
    getClientDashboard
);

export default clientRouter;
