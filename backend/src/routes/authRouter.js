import express from "express";
import { login, logout, me, register } from "../controller/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const authRouter = express.Router();

/**
 * Authentication Routes
 *
 * Handles user registration, login, logout,
 * and retrieval of the authenticated user's profile.
 *
 * Public routes:
 * - register
 * - login
 *
 * Protected routes:
 * - me
 * - logout
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
 * Authenticates user credentials and issues a JWT.
 */
authRouter.post("/login", login);

/**
 * POST /logout
 *
 * Terminates the authenticated session
 * by clearing the authentication cookie.
 */
authRouter.post("/logout", logout);

/**
 * GET /me
 *
 * Returns the currently authenticated user's details.
 */
authRouter.get("/me", protect, me);

// Export authentication router for mounting under /api/auth (or similar)
export default authRouter;
