import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from "cookie-parser";
import path from 'path';

import { connectDb } from './config/db.js';
import { errorHandler } from './errorHandler/errorHandler.js';
import authRouter from './routes/authRouter.js';
import adminRouter from './routes/adminRoutes.js';
import advocateRouter from './routes/advocateRoutes.js';
import caseRouter from './routes/caseRoutes.js';
import taskRouter from './routes/taskRoutes.js';
import evidenceRouter from './routes/evidenceRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import appointmentRouter from './routes/appointmentRoutes.js';
import clientRouter from './routes/clientRoutes.js';
import juniorRouter from './routes/juniorRoutes.js';

/**
 * Application entry point
 *
 * Responsible for:
 * - Loading environment variables
 * - Initializing the Express application
 * - Registering global middleware
 * - Mounting all API routes
 * - Connecting to the database
 * - Starting the HTTP server
 */

// Load environment variables before accessing process.env
dotenv.config();

const app = express();

/**
 * Global middleware
 */

// Parse incoming JSON request bodies
// Enables Express to read req.body for JSON payloads
app.use(express.json());

// Enable CORS with credentials support
// Required for cookie-based authentication with frontend
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));

// Parse cookies from incoming requests
// Required for JWT stored in HTTP-only cookies
app.use(cookieParser());

/**
 * Route mounting
 *
 * Each router encapsulates a specific domain
 * and enforces its own authentication and authorization logic.
 */
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/advocate", advocateRouter);
app.use("/api/cases", caseRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/evidence", evidenceRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/client", clientRouter);
app.use("/api/junior", juniorRouter);

/**
 * Static file serving
 *
 * Exposes uploaded files for controlled access.
 * Typically used for serving evidence files uploaded via Multer.
 */
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/**
 * Centralized error-handling middleware
 *
 * Must be registered AFTER all routes
 * to properly capture propagated errors.
 */
app.use(errorHandler);

/**
 * Database connection and server startup
 */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Establish database connection before accepting requests
        await connectDb();

        // Start HTTP server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        // Fail fast if server initialization fails
        console.error("Failed to start server", error.message);
    }
};

// Initialize application
startServer();
