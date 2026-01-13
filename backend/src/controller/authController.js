import User from "../model/user.js";
import jwt from "jsonwebtoken";

/**
 * User Registration Controller
 *
 * Handles new user account creation with
 * role validation and password confirmation.
 */
export const register = async (req, res, next) => {
    try {
        // Extract registration fields from request body
        let {
            name,
            email,
            address,
            phone,
            password,
            passwordConfirm,
            role
        } = req.body;

        // Normalize email to enforce case-insensitive uniqueness
        email = email?.toLowerCase();

        // Restrict role assignment to publicly allowed roles
        const allowedRoles = ["client", "advocate", "junior_advocate"];
        if (role && !allowedRoles.includes(role)) {
            const error = new Error("Invalid role");
            error.statusCode = 400;
            return next(error);
        }

        // Ensure password and confirmation match
        if (password != passwordConfirm) {
            const error = new Error("Passwords must match");
            error.statusCode = 400;
            return next(error);
        }

        // Create new user record
        const user = await User.create({
            name,
            email,
            address,
            phone,
            password,
            passwordConfirm,
            role
        });

        // Respond with minimal user details after successful registration
        res.status(201).json({
            success: true,
            message: "Registration successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        // Forward validation or persistence errors to centralized handler
        next(error);
    }
};

/**
 * User Login Controller
 *
 * Authenticates credentials, issues a JWT,
 * and sets a secure HTTP-only authentication cookie.
 */
export const login = async (req, res, next) => {
    try {
        // Extract login credentials from request body
        let { email, password } = req.body;

        // Normalize email input for consistent lookup
        email = email?.toLowerCase();

        // Validate presence of required credentials
        if (!email || !password) {
            const error = new Error("Invalid credentials");
            error.statusCode = 400;
            return next(error);
        }

        // Ensure JWT secret is configured before token generation
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        // Retrieve user record and explicitly include password hash
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            const error = new Error("Invalid credentials");
            error.statusCode = 400;
            return next(error);
        }

        // Prevent login for deactivated accounts
        if (!user.isActive) {
            const error = new Error("Account is deactivated");
            error.statusCode = 403;
            return next(error);
        }

        // Compare provided password with stored hash
        const passwordMatch = await user.correctPassword(
            password,
            user.password
        );

        if (!passwordMatch) {
            const error = new Error("Invalid credentials");
            error.statusCode = 400;
            return next(error);
        }

        // Generate JWT containing user identity and role
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // Store JWT in an HTTP-only cookie to mitigate XSS risks
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        // Update last login timestamp without triggering full validation
        user.lastLoginAt = new Date();
        await user.save({ validateBeforeSave: false });

        // Respond with authenticated user details
        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                verificationStatus: user.verificationStatus
            }
        });

    } catch (error) {
        // Forward unexpected errors to centralized error handler
        next(error);
    }
};

/**
 * User Logout Controller
 *
 * Clears the authentication cookie to terminate the session.
 */
export const logout = (req, res) => {
    // Overwrite token cookie with an expired value
    res.cookie("token", "", {
        httpOnly: true,
        expires: new Date(0),
    });

    res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
};

/**
 * Get Current User Controller
 *
 * Returns the authenticated user's data
 * as attached by authentication middleware.
 */
export const me = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};
