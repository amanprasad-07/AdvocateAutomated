import jwt from "jsonwebtoken";
import User from "../model/user.js";

/**
 * Protect middleware
 * - Verifies JWT
 * - Attaches user to req.user
 * - Blocks deactivated users
 */
export const protect = async (req, res, next) => {
    try {
        let token;

        // 1. Get token (cookie OR Authorization header)
        if (req.cookies?.token) {
            token = req.cookies.token;
        } else if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            const error = new Error("Not authenticated");
            error.statusCode = 401;
            return next(error);
        }

        // 2. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Fetch user
        const user = await User.findById(decoded.id);
        if (!user) {
            const error = new Error("User no longer exists");
            error.statusCode = 401;
            return next(error);
        }

        // 4. Check account status
        if (!user.isActive) {
            const error = new Error("Account is deactivated");
            error.statusCode = 403;
            return next(error);
        }

        // 5. Attach user to request
        req.user = user;
        next();

    } catch (error) {
        next(error);
    }
};

/**
 * Role-based access control
 * Usage: requireRole("admin"), requireRole("advocate")
 */
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
           
            const error = new Error("Access denied");
            error.statusCode = 403;
            return next(error);
        }
        next();
    };
};

/**
 * Advocate verification check
 * Blocks advocate actions until verified
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
