/**
 * Centralized error-handling middleware for Express.
 *
 * This middleware captures errors thrown from controllers,
 * assigns appropriate HTTP status codes, and sends
 * a consistent JSON response to the client.
 */

export const errorHandler = (error, req, res, next) => {
    // Default to 500 if status code is not explicitly set
    const statusCode = error?.statusCode || 500;

    // Use provided error message or fallback message
    const message = error?.message || "Something went wrong. Please try again later";

    console.error("Error:", error?.stack || message);
    
    res.status(statusCode).json({
        success: false,
        message,
    });
}
