import express from "express";
import { getAllAdvocates, getAllClients, getAllJuniors } from "../controller/getUsersController.js";
import { protect } from "../middleware/authMiddleware.js";


const getUsersRouter = express.Router();

getUsersRouter.get(
  "/getAdvocates",
  protect,
  getAllAdvocates
);

getUsersRouter.get(
  "/getClients",
  protect,
  getAllClients
);

getUsersRouter.get(
  "/getJuniors",
  protect,
  getAllJuniors
);

export default getUsersRouter;