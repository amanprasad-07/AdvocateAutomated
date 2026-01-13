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
import getUsersRouter from './routes/getUsersRoutes.js';
import verificationRouter from './routes/verificationRoutes.js';

/**
 * Application Entry Point
 *
 * Responsibilities:
 * - Load environment variables
 * - Initialize the Express application
 * - Register global middleware
 * - Mount all API routes
 * - Connect to the database
 * - Start the HTTP server
 */

// Load environment variables before accessing process.env
dotenv.config();

// Initialize Express application
const app = express();

/* -------------------------------------------------------------------------- */
/*                               Global Middleware                             */
/* -------------------------------------------------------------------------- */

// Parse incoming JSON payloads
// Enables access to req.body for JSON-based requests
app.use(express.json());

// Enable Cross-Origin Resource Sharing
// Allows frontend applications to send cookies for authentication
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));

// Parse cookies attached to incoming requests
// Required for JWT-based authentication using HTTP-only cookies
app.use(cookieParser());

/* -------------------------------------------------------------------------- */
/*                               Route Mounting                                */
/* -------------------------------------------------------------------------- */
/**
 * Each router is responsible for a specific domain
 * and enforces its own authentication and authorization rules.
 */
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/client", clientRouter);
app.use("/api/junior", juniorRouter);
app.use("/api/advocate", advocateRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/cases", caseRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/evidence", evidenceRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/users", getUsersRouter);
app.use("/api/verification", verificationRouter);

/* -------------------------------------------------------------------------- */
/*                             Static File Serving                              */
/* -------------------------------------------------------------------------- */
/**
 * Serves static files from the uploads directory.
 * Typically used for accessing uploaded evidence files.
 */
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/* -------------------------------------------------------------------------- */
/*                         Centralized Error Handling                           */
/* -------------------------------------------------------------------------- */
/**
 * Global error handler.
 * Must be registered after all routes to catch propagated errors.
 */
app.use(errorHandler);

/* -------------------------------------------------------------------------- */
/*                     Database Connection & Server Startup                     */
/* -------------------------------------------------------------------------- */

// Resolve port from environment or fallback to default
const PORT = process.env.PORT || 5000;

/**
 * Starts the application by:
 * - Establishing a database connection
 * - Launching the HTTP server
 */
const startServer = async () => {
    try {
        // Connect to the database before accepting requests
        await connectDb();

        // Start listening for incoming HTTP requests
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        // Fail fast if startup or database connection fails
        console.error("Failed to start server", error.message);
    }
};

// Bootstrap the application
startServer();
