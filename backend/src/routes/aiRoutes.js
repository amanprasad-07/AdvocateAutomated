import express from "express";
import { aiCaseAssistant } from "../controller/aiCaseAssistantController.js";

const aiRouter = express.Router();

aiRouter.post("/case-assistant", aiCaseAssistant);

export default aiRouter;
