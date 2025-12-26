/**
 * Centralized error-handling middleware for Express.
 *
 * This middleware captures errors thrown from controllers,
 * assigns appropriate HTTP status codes, and sends
 * a consistent JSON response to the client.
 *
 * It must be registered AFTER all routes and other middleware
 * to ensure it catches propagated errors correctly.
 */

export const errorHandler = (error, req, res, next) => {
    // Determine HTTP status code
    // Falls back to 500 (Internal Server Error) if not explicitly defined
    const statusCode = error?.statusCode || 500;

    // Determine error message
    // Uses the custom error message if available, otherwise a generic fallback
    const message = error?.message || "Something went wrong. Please try again later";

    // Log full error stack trace in development/debug environments
    // Helps with debugging without exposing sensitive details to the client
    console.error("Error:", error?.stack || message);
    
    // Send standardized JSON error response
    // Ensures consistent error format across the entire API
    res.status(statusCode).json({
        success: false,
        message,
    });
}
