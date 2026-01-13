export const errorHandler = (error, req, res, next) => {
    let statusCode = error.statusCode || 500;
    let message = error.message || "Something went wrong. Please try again later";

    // Mongoose validation errors
    if (error.name === "ValidationError") {
        statusCode = 400;

        // Extract clean validation messages only
        message = Object.values(error.errors)
            .map(err => err.message)
            .join(". ");
    }

    // MongoDB duplicate key error (email already exists, etc.)
    if (error.code === 11000) {
        statusCode = 409;
        const field = Object.keys(error.keyValue)[0];
        message = `${field} already exists`;
    }

    // Log full error only on server
    console.error("Error:", error.stack || error);

    res.status(statusCode).json({
        success: false,
        message
    });
};
