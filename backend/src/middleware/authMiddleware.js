import jwt from "jsonwebtoken";
import User from "../model/user.js";

/**
 * Authentication protection middleware
 *
 * - Verifies JWT from cookies or Authorization header
 * - Attaches authenticated user to req.user
 * - Blocks access for deactivated accounts
 */
export const protect = async (req, res, next) => {
    try {
        let token;

        /**
         * 1. Extract authentication token
         * Priority:
         * - HTTP-only cookie (web clients)
         * - Authorization header (API / mobile clients)
         */
        if (req.cookies?.token) {
            token = req.cookies.token;
        } else if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        // Block request if no token is provided
        if (!token) {
            const error = new Error("Not authenticated");
            error.statusCode = 401;
            return next(error);
        }

        /**
         * 2. Verify JWT signature and decode payload
         * Throws if token is invalid or expired
         */
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        /**
         * 3. Fetch user from database
         * Ensures the account still exists
         */
        const user = await User.findById(decoded.id);
        if (!user) {
            const error = new Error("User no longer exists");
            error.statusCode = 401;
            return next(error);
        }

        /**
         * 4. Enforce account activation status
         * Prevents access for deactivated users
         */
        if (!user.isActive) {
            const error = new Error("Account is deactivated");
            error.statusCode = 403;
            return next(error);
        }

        /**
         * 5. Attach authenticated user to request object
         * Makes user data available to downstream middleware/controllers
         */
        req.user = user;
        next();

    } catch (error) {
        // Forward token verification or database errors
        next(error);
    }
};

/**
 * Role-based access control middleware
 *
 * Usage:
 *   requireRole("admin")
 *   requireRole("advocate", "junior_advocate")
 */
export const requireRole = (...roles) => {
    return (req, res, next) => {
        // Block access if user's role is not permitted
        if (!roles.includes(req.user.role)) {
            const error = new Error("Access denied");
            error.statusCode = 403;
            return next(error);
        }
        next();
    };
};

/**
 * Advocate verification enforcement middleware
 *
 * Blocks advocate or junior advocate actions
 * until verification status is approved
 */
export const requireVerifiedAdvocate = (req, res, next) => {
    if (
        (req.user.role === "advocate" ||
            req.user.role === "junior_advocate") &&
        req.user.verificationStatus !== "approved"
    ) {
        const error = new Error("Advocate account not verified");
        error.statusCode = 403;
        return next(error);
    }
    next();
};
