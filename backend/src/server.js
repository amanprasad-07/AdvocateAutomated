import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from "cookie-parser";

import { connectDb } from './config/db.js';
import { errorHandler } from './errorHandler/errorHandler.js';
import authRouter from './routes/authRouter.js';
import adminRouter from './routes/adminRoutes.js';
import advocateRouter from './routes/advocateRoutes.js';
import caseRouter from './routes/caseRoutes.js';
import taskRouter from './routes/taskRoutes.js';
import evidenceRouter from './routes/evidenceRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';

/**
 * Application entry point
 *
 * Responsible for:
 * - Loading environment variables
 * - Initializing Express application
 * - Registering middleware
 * - Mounting API routes
 * - Connecting to database
 * - Starting HTTP server
 */

// Load environment variables before accessing process.env
dotenv.config();

const app = express();

/**
 * Global middleware
 */

// Parse incoming JSON request bodies
app.use(express.json());

// Enable CORS with credentials support for frontend integration
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));

// Parse cookies (required for JWT stored in HTTP-only cookies)
app.use(cookieParser());

/**
 * Route mounting
 *
 * Each router is responsible for a specific domain
 * and enforces its own authorization rules.
 */
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/advocate", advocateRouter);
app.use("/api/cases", caseRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/evidence", evidenceRouter);
app.use("/api/payments", paymentRouter);

/**
 * Centralized error-handling middleware
 * Must be registered AFTER all routes
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
