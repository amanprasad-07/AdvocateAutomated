import express from "express";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { submitAdvocateProfile } from "../controller/Credentials.js";

const verificationRouter  = express.Router();

verificationRouter.patch("/profile",
    protect,
    requireRole("advocate","junior_advocate"),
    submitAdvocateProfile
)

export default verificationRouter;