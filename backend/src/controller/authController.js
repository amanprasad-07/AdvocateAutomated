import User from "../model/user.js";
import jwt from "jsonwebtoken";

export const register = async (req, res, next) => {
    try {
        let {
            name,
            email,
            address,
            phone,
            password,
            passwordConfirm,
            role
        } = req.body;

        // Normalize input
        email = email?.toLowerCase();

        const allowedRoles = ["client", "advocate", "junior_advocate"];
        if (role && !allowedRoles.includes(role)) {
            const error = new Error("Invalid role");
            error.statusCode = 400;
            return next(error);
        }

        const user = await User.create({
            name,
            email,
            address,
            phone,
            password,
            passwordConfirm,
            role
        });

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
        next(error);
    }
};

//login controller

export const login = async (req, res, next) => {
    try {
        let { email, password } = req.body;

        email = email?.toLowerCase();

        if (!email || !password) {
            const error = new Error("Invalid credentials");
            error.statusCode = 400;
            return next(error);
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            const error = new Error("Invalid credentials");
            error.statusCode = 400;
            return next(error);
        }

        if (!user.isActive) {
            const error = new Error("Account is deactivated");
            error.statusCode = 403;
            return next(error);
        }

        const passwordMatch = await user.correctPassword(
            password,
            user.password
        );

        if (!passwordMatch) {
            const error = new Error("Invalid credentials");
            error.statusCode = 400;
            return next(error);
        }


        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        user.lastLoginAt = new Date();
        await user.save({ validateBeforeSave: false });

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
        next(error);
    }
};
