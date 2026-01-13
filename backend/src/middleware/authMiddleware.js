import jwt from "jsonwebtoken";
import User from "../model/user.js";

/**
 * Authentication Protection Middleware
 *
 * - Verifies JWT from cookies or Authorization header
 * - Attaches the authenticated user to req.user
 * - Blocks access for deactivated accounts
 */
export const protect = async (req, res, next) => {
    try {
        let token;

        /**
         * Step 1: Extract authentication token
         *
         * Priority order:
         * - HTTP-only cookie (browser-based clients)
         * - Authorization header (API or mobile clients)
         */
        if (req.cookies?.token) {
            token = req.cookies.token;
        } else if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        // Reject request if no authentication token is provided
        if (!token) {
            const error = new Error("Not authenticated");
            error.statusCode = 401;
            return next(error);
        }

        /**
         * Step 2: Verify JWT signature and decode payload
         *
         * Throws an error if the token is invalid or expired
         */
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        /**
         * Step 3: Fetch user from the database
         *
         * Ensures the user account still exists
         */
        const user = await User.findById(decoded.id);
        if (!user) {
            const error = new Error("User no longer exists");
            error.statusCode = 401;
            return next(error);
        }

        /**
         * Step 4: Enforce account activation status
         *
         * Prevents access for users whose accounts are deactivated
         */
        if (!user.isActive) {
            const error = new Error("Account is deactivated");
            error.statusCode = 403;
            return next(error);
        }

        /**
         * Step 5: Attach authenticated user to request object
         *
         * Makes user data available to downstream middleware and controllers
         */
        req.user = user;
        next();

    } catch (error) {
        // Forward token verification or database errors to error handler
        next(error);
    }
};

/**
 * Role-Based Access Control Middleware
 *
 * Restricts access to users whose role matches
 * one of the permitted roles.
 *
 * Usage examples:
 *   requireRole("admin")
 *   requireRole("advocate", "junior_advocate")
 */
export const requireRole = (...roles) => {
    return (req, res, next) => {
        // Block access if the user's role is not permitted
        if (!roles.includes(req.user.role)) {
            const error = new Error("Access denied");
            error.statusCode = 403;
            return next(error);
        }
        next();
    };
};

/**
 * Verified Advocate Enforcement Middleware
 *
 * Prevents advocates or junior advocates from
 * performing restricted actions until their
 * verification status is approved.
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
