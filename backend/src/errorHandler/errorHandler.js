/**
 * Global Error Handling Middleware
 *
 * Centralized handler for application errors.
 * Normalizes error responses and ensures consistent
 * structure across the API.
 */
export const errorHandler = (error, req, res, next) => {
    // Default to internal server error if status is not explicitly set
    let statusCode = error.statusCode || 500;
    let message = error.message || "Something went wrong. Please try again later";

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
        statusCode = 400;

        // Aggregate and format individual field validation messages
        message = Object.values(error.errors)
            .map(err => err.message)
            .join(". ");
    }

    // Handle MongoDB duplicate key errors (e.g., unique fields like email)
    if (error.code === 11000) {
        statusCode = 409;

        // Identify the duplicated field for a clearer response
        const field = Object.keys(error.keyValue)[0];
        message = `${field} already exists`;
    }

    // Log detailed error information on the server for debugging
    console.error("Error:", error.stack || error);

    // Send standardized error response to the client
    res.status(statusCode).json({
        success: false,
        message
    });
};
