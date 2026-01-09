import express from "express";
import { login, logout, me, register } from "../controller/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const authRouter = express.Router();

/**
 * Authentication routes
 *
 * Handles user registration and login.
 * These routes are intentionally public and
 * do not require authentication middleware.
 */

/**
 * POST /register
 *
 * Registers a new user account.
 * Accessible to clients, advocates, and junior advocates.
 */
authRouter.post("/register", register);

/**
 * POST /login
 *
 * Authenticates user credentials and issues JWT.
 */
authRouter.post("/login", login);

authRouter.post("/logout", logout);

authRouter.get("/me",protect, me);

// Export authentication router for mounting under /api/auth (or similar)
export default authRouter;
