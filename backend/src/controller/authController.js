import User from "../model/user.js";
import jwt from "jsonwebtoken";

/**
 * User registration controller.
 *
 * Handles creation of new user accounts with
 * role-based validation and secure credential storage.
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

        // Normalize email input to ensure consistency
        email = email?.toLowerCase();

        // Restrict role assignment to allowed public roles only
        const allowedRoles = ["client", "advocate", "junior_advocate"];
        if (role && !allowedRoles.includes(role)) {
            const error = new Error("Invalid role");
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

        // Send successful registration response
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
        // Forward validation or database errors to error handler
        next(error);
    }
};

/**
 * User login controller.
 *
 * Authenticates user credentials, issues JWT,
 * and sets a secure HTTP-only authentication cookie.
 */
export const login = async (req, res, next) => {
    try {
        // Extract login credentials from request body
        let { email, password } = req.body;

        // Normalize email input
        email = email?.toLowerCase();

        // Basic credential presence validation
        if (!email || !password) {
            const error = new Error("Invalid credentials");
            error.statusCode = 400;
            return next(error);
        }

        // Ensure JWT secret is properly configured
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        // Fetch user and explicitly include password field
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

        // Validate provided password against stored hash
        const passwordMatch = await user.correctPassword(
            password,
            user.password
        );

        if (!passwordMatch) {
            const error = new Error("Invalid credentials");
            error.statusCode = 400;
            return next(error);
        }

        // Generate JSON Web Token with user identity and role
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        // Set authentication token as HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        // Update last login timestamp without triggering validation
        user.lastLoginAt = new Date();
        await user.save({ validateBeforeSave: false });

        // Send login success response
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
