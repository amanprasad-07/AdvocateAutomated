import mongoose from 'mongoose'

// Centralized database connection utility
// This function is responsible for establishing and validating the MongoDB connection
export const connectDb = async () => {
    try {
        // Validate presence of MongoDB connection string
        // Prevents attempting a connection with an undefined or missing URI
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined in environment variables");
        }

        // Attempt database connection
        // Uses Mongoose's default connection with built-in connection pooling
        // Async/await ensures the application waits for successful connection
        await mongoose.connect(process.env.MONGO_URI);

        // Log confirmation once the database connection is established
        console.log("Database connected successfully");

    } catch (error) {
        // Log connection failure with a clear error message
        console.error("Database connection failed", error.message);
        
        // Exit process with failure code
        // Ensures the server does not continue running without a valid database connection
        process.exit(1);
    }
}
